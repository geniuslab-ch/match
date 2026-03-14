"""
Scraper Google Maps — Agences immobilières du Canton de Vaud
Utilise Playwright (navigateur headless) pour simuler la recherche,
faire défiler la liste de résultats et extraire les informations.

Usage:
    python scrape_agences_vaud.py [--headless] [--output fichier.csv] [--max-scrolls 40]
"""

import argparse
import csv
import re
import sys
import time

from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout


SEARCH_QUERY = "Agence immobilière Canton de Vaud"
GOOGLE_MAPS_URL = "https://www.google.com/maps"

# CSS selectors (Google Maps, susceptibles de changer)
SEARCH_INPUT = "#searchboxinput"
SEARCH_BUTTON = "#searchbox-searchbutton"
RESULTS_CONTAINER = 'div[role="feed"]'
RESULT_LINKS = f'{RESULTS_CONTAINER} a[href^="https://www.google.com/maps/place"]'


def accept_cookies(page):
    """Accepte la bannière cookies Google si elle apparaît."""
    try:
        btn = page.locator('button:has-text("Tout accepter"), button:has-text("Accept all")')
        btn.first.click(timeout=5000)
        page.wait_for_timeout(1000)
    except (PwTimeout, Exception):
        pass  # pas de bannière


def search_google_maps(page, query: str):
    """Lance la recherche sur Google Maps."""
    page.goto(GOOGLE_MAPS_URL, wait_until="domcontentloaded")
    page.wait_for_timeout(2000)
    accept_cookies(page)

    page.fill(SEARCH_INPUT, query)
    page.click(SEARCH_BUTTON)
    page.wait_for_timeout(3000)


def scroll_results(page, max_scrolls: int = 40):
    """Fait défiler le panneau de résultats pour charger tous les éléments."""
    feed = page.locator(RESULTS_CONTAINER)
    try:
        feed.wait_for(timeout=10000)
    except PwTimeout:
        print("Impossible de trouver le panneau de résultats.", file=sys.stderr)
        return

    previous_count = 0
    stable_rounds = 0

    for i in range(max_scrolls):
        # Scroll vers le bas du feed
        feed.evaluate("el => el.scrollTop = el.scrollHeight")
        page.wait_for_timeout(1500)

        current_count = page.locator(RESULT_LINKS).count()
        print(f"  Scroll {i + 1}/{max_scrolls} — {current_count} résultats chargés")

        # Détecte si on a atteint la fin de la liste
        end_marker = page.locator('span.HlvSq, p.fontBodyMedium:has-text("plus de résultats")')
        if end_marker.count() > 0:
            print("  Fin de la liste atteinte.")
            break

        if current_count == previous_count:
            stable_rounds += 1
            if stable_rounds >= 3:
                print("  Aucun nouveau résultat, arrêt du défilement.")
                break
        else:
            stable_rounds = 0

        previous_count = current_count


def extract_place_details(page, link) -> dict | None:
    """Clique sur un résultat et extrait les détails depuis le panneau latéral."""
    try:
        link.click()
        page.wait_for_timeout(2500)
    except Exception:
        return None

    details = {
        "nom": "",
        "adresse": "",
        "telephone": "",
        "site_web": "",
    }

    # Nom
    try:
        heading = page.locator('h1.DUwDvf, h1.fontHeadlineLarge')
        if heading.count() > 0:
            details["nom"] = heading.first.inner_text().strip()
    except Exception:
        pass

    # Adresse — bouton avec aria-label contenant "Adresse" ou data-item-id "address"
    try:
        addr_btn = page.locator(
            'button[data-item-id="address"], '
            'button[aria-label*="Adresse"], '
            'button[aria-label*="Address"]'
        )
        if addr_btn.count() > 0:
            details["adresse"] = addr_btn.first.get_attribute("aria-label") or ""
            # Nettoyage : retirer le préfixe "Adresse: " ou "Address: "
            details["adresse"] = re.sub(
                r"^(Adresse|Address)\s*:\s*", "", details["adresse"]
            ).strip()
    except Exception:
        pass

    # Téléphone
    try:
        phone_btn = page.locator(
            'button[data-item-id^="phone:"], '
            'button[aria-label*="téléphone"], '
            'button[aria-label*="phone" i]'
        )
        if phone_btn.count() > 0:
            label = phone_btn.first.get_attribute("aria-label") or ""
            # Extraction du numéro
            phone_match = re.search(r"[\d\s\+\-().]{7,}", label)
            details["telephone"] = phone_match.group().strip() if phone_match else label
    except Exception:
        pass

    # Site Web
    try:
        web_btn = page.locator(
            'a[data-item-id="authority"], '
            'a[aria-label*="site Web"], '
            'a[aria-label*="Website" i]'
        )
        if web_btn.count() > 0:
            details["site_web"] = web_btn.first.get_attribute("href") or ""
    except Exception:
        pass

    return details if details["nom"] else None


def scrape(headless: bool = True, max_scrolls: int = 40, output: str = "agences_immobilieres_vaud.csv"):
    """Exécute le scraping complet avec écriture incrémentale du CSV."""
    fieldnames = ["nom", "adresse", "telephone", "site_web"]
    count = 0

    with open(output, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";")
        writer.writeheader()

        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=headless)
            context = browser.new_context(
                locale="fr-CH",
                viewport={"width": 1280, "height": 900},
            )
            page = context.new_page()

            print(f"Recherche : '{SEARCH_QUERY}'")
            search_google_maps(page, SEARCH_QUERY)

            print("Défilement des résultats…")
            scroll_results(page, max_scrolls=max_scrolls)

            # Collecte des liens de résultats
            links = page.locator(RESULT_LINKS)
            total = links.count()
            print(f"\n{total} résultats trouvés. Extraction des détails…\n")

            for idx in range(total):
                # Re-query : le DOM change après chaque clic + retour
                current_links = page.locator(RESULT_LINKS)
                if idx >= current_links.count():
                    break

                link = current_links.nth(idx)
                details = extract_place_details(page, link)

                if details:
                    writer.writerow(details)
                    f.flush()
                    count += 1
                    print(
                        f"  [{idx + 1}/{total}] {details['nom']} — "
                        f"{details['adresse'][:40]}…"
                    )

                # Retour à la liste de résultats
                try:
                    back_btn = page.locator('button[aria-label="Retour"], button[jsaction*="back"]')
                    if back_btn.count() > 0:
                        back_btn.first.click()
                        page.wait_for_timeout(1500)
                    else:
                        page.go_back()
                        page.wait_for_timeout(2000)
                except Exception:
                    page.go_back()
                    page.wait_for_timeout(2000)

            browser.close()

    print(f"\n{count} agences exportées → {output}")
    return count


def main():
    parser = argparse.ArgumentParser(
        description="Scraper Google Maps — Agences immobilières Vaud"
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        default=False,
        help="Exécuter le navigateur en mode headless (sans interface)",
    )
    parser.add_argument(
        "--output", "-o",
        default="agences_immobilieres_vaud.csv",
        help="Chemin du fichier CSV de sortie (défaut: agences_immobilieres_vaud.csv)",
    )
    parser.add_argument(
        "--max-scrolls",
        type=int,
        default=40,
        help="Nombre maximum de défilements (défaut: 40)",
    )
    args = parser.parse_args()

    count = scrape(headless=args.headless, max_scrolls=args.max_scrolls, output=args.output)

    if count == 0:
        print("Aucun résultat extrait.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

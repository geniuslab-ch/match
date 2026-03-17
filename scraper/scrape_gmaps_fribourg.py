"""
Extraction des agences immobilières du Canton de Fribourg via Google Maps (Playwright).

Ce script simule un navigateur, effectue des recherches sur Google Maps,
fait défiler la liste de résultats pour tout charger, puis extrait :
  - Nom de l'agence
  - Adresse
  - Téléphone
  - Site Web

Usage:
    pip install playwright
    playwright install chromium

    python scrape_gmaps_fribourg.py [--output fichier.csv] [--headless]
"""

import argparse
import csv
import re
import sys
import time
import urllib.parse

from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout


QUERIES = [
    # Grandes villes
    "agence immobilière Fribourg",
    "agence immobilière Bulle",
    "agence immobilière Morat",
    "agence immobilière Estavayer-le-Lac",
    "agence immobilière Romont Fribourg",
    # Agglomération fribourgeoise
    "agence immobilière Marly Fribourg",
    "agence immobilière Villars-sur-Glâne",
    "agence immobilière Givisiez",
    "agence immobilière Granges-Paccot",
    "agence immobilière Belfaux",
    "agence immobilière Corminboeuf",
    # Partie alémanique (canton bilingue)
    "agence immobilière Düdingen",
    "agence immobilière Tafers",
    "agence immobilière Flamatt",
    "agence immobilière Schmitten Fribourg",
    "agence immobilière Wünnewil-Flamatt",
    "Immobilien Agentur Freiburg Schweiz",
    "Immobilienmakler Sensebezirk",
    # Gruyère
    "agence immobilière Gruyères",
    "agence immobilière Châtel-Saint-Denis",
    "agence immobilière Broc Fribourg",
    "agence immobilière Charmey Fribourg",
    # Broye
    "agence immobilière Payerne Fribourg",
    "agence immobilière Domdidier",
    # Recherches génériques
    "agence immobilière Canton de Fribourg",
    "régie immobilière Canton de Fribourg",
    "courtier immobilier Fribourg Suisse",
]

GMAPS_SEARCH_URL = "https://www.google.com/maps/search/{query}"

FEED_SELECTOR = 'div[role="feed"]'
RESULT_SELECTOR = 'div[role="feed"] > div > div > a'
RESULT_ITEM_SELECTOR = 'div[role="feed"] > div'


def build_url(query: str) -> str:
    return GMAPS_SEARCH_URL.format(query=urllib.parse.quote_plus(query))


def scroll_results(page, max_scrolls: int = 30, pause: float = 1.5) -> int:
    """Fait défiler la liste Google Maps jusqu'à épuisement des résultats."""
    feed = page.query_selector(FEED_SELECTOR)
    if not feed:
        return 0

    previous_count = 0
    stale_rounds = 0

    for i in range(max_scrolls):
        feed.evaluate("el => el.scrollTop = el.scrollHeight")
        time.sleep(pause)

        end_marker = page.query_selector('div[role="feed"] p.fontBodyMedium span')
        if end_marker:
            text = end_marker.inner_text()
            if "fin des résultats" in text.lower() or "end of results" in text.lower():
                break

        items = page.query_selector_all(RESULT_SELECTOR)
        current_count = len(items)

        if current_count == previous_count:
            stale_rounds += 1
            if stale_rounds >= 3:
                break
        else:
            stale_rounds = 0
            previous_count = current_count

    return previous_count


def extract_from_panel(page, timeout: float = 3000) -> dict | None:
    """Extrait les infos d'un établissement depuis le panneau de détail."""
    info = {"nom": "", "adresse": "", "telephone": "", "site_web": ""}

    try:
        name_el = page.wait_for_selector('h1.fontHeadlineLarge', timeout=timeout)
        if name_el:
            info["nom"] = name_el.inner_text().strip()
    except PwTimeout:
        return None

    addr_el = page.query_selector('button[data-item-id="address"]')
    if addr_el:
        info["adresse"] = addr_el.get_attribute("aria-label") or ""
        info["adresse"] = re.sub(r"^Adresse\s*:\s*", "", info["adresse"]).strip()

    phone_el = page.query_selector('button[data-item-id^="phone:"]')
    if phone_el:
        raw = phone_el.get_attribute("data-item-id") or ""
        info["telephone"] = raw.replace("phone:tel:", "").replace("phone:", "").strip()

    web_el = page.query_selector('a[data-item-id="authority"]')
    if web_el:
        info["site_web"] = web_el.get_attribute("href") or ""

    return info if info["nom"] else None


def scrape_query(page, query: str, max_scrolls: int = 30) -> list[dict]:
    """Effectue une recherche et extrait tous les résultats."""
    url = build_url(query)
    page.goto(url, wait_until="domcontentloaded")

    try:
        consent_btn = page.wait_for_selector(
            'button:has-text("Tout accepter"), button:has-text("Accept all")',
            timeout=3000,
        )
        if consent_btn:
            consent_btn.click()
            time.sleep(1)
    except PwTimeout:
        pass

    try:
        page.wait_for_selector(FEED_SELECTOR, timeout=8000)
    except PwTimeout:
        info = extract_from_panel(page, timeout=4000)
        return [info] if info else []

    scroll_results(page, max_scrolls=max_scrolls)

    result_links = page.query_selector_all(RESULT_SELECTOR)
    results = []

    for idx, link in enumerate(result_links):
        try:
            link.scroll_into_view_if_needed()
            link.click()
            time.sleep(1.2)

            info = extract_from_panel(page, timeout=4000)
            if info:
                results.append(info)

            back_btn = page.query_selector('button[aria-label="Retour"], button[aria-label="Back"]')
            if back_btn:
                back_btn.click()
                time.sleep(0.8)
                try:
                    page.wait_for_selector(FEED_SELECTOR, timeout=5000)
                except PwTimeout:
                    pass

                result_links_new = page.query_selector_all(RESULT_SELECTOR)
                if idx + 1 < len(result_links_new):
                    result_links = result_links_new

        except Exception as e:
            print(f"    Erreur résultat {idx + 1}: {e}", file=sys.stderr)
            continue

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Scraping agences immobilières Fribourg via Google Maps (Playwright)"
    )
    parser.add_argument(
        "--output", "-o",
        default="agences_immobilieres_fribourg.csv",
        help="Fichier CSV de sortie (défaut: agences_immobilieres_fribourg.csv)",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        default=False,
        help="Lancer en mode headless (sans fenêtre visible)",
    )
    parser.add_argument(
        "--max-scrolls",
        type=int,
        default=30,
        help="Nombre maximum de défilements par requête (défaut: 30)",
    )
    args = parser.parse_args()

    fieldnames = ["nom", "adresse", "telephone", "site_web"]
    seen = set()
    count = 0

    with (
        sync_playwright() as pw,
        open(args.output, "w", newline="", encoding="utf-8-sig") as f,
    ):
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";")
        writer.writeheader()

        browser = pw.chromium.launch(headless=args.headless)
        context = browser.new_context(
            locale="fr-CH",
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()

        for i, query in enumerate(QUERIES):
            print(f"\n[{i + 1}/{len(QUERIES)}] Recherche : '{query}'")
            try:
                results = scrape_query(page, query, max_scrolls=args.max_scrolls)
            except Exception as e:
                print(f"  ERREUR : {e}", file=sys.stderr)
                results = []

            new_count = 0
            for place in results:
                key = (place["nom"].lower(), place["adresse"].lower())
                if key in seen:
                    continue
                seen.add(key)
                writer.writerow(place)
                f.flush()
                count += 1
                new_count += 1

            print(f"  → {len(results)} trouvés, {new_count} nouveaux ({count} uniques au total)")

            if i < len(QUERIES) - 1:
                time.sleep(2)

        browser.close()

    print(f"\n{'=' * 50}")
    print(f"{count} agences exportées → {args.output}")
    return count


if __name__ == "__main__":
    count = main()
    if count == 0:
        sys.exit(1)

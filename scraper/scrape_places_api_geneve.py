"""
Extraction des agences immobilières du Canton de Genève via l'API Google Places.

Méthode fiable (pas de CAPTCHA, pas de blocage) nécessitant une clé API Google Places.

Obtenir une clé gratuite :
  1. Allez sur https://console.cloud.google.com/
  2. Créez un projet → Activez "Places API (New)"
  3. Créez une clé API dans "Identifiants"
  Google offre 200 $ de crédits/mois (= ~6600 requêtes Text Search gratuites)

Usage:
    python scrape_places_api_geneve.py --api-key VOTRE_CLE [--output fichier.csv]

    Ou via variable d'environnement :
    GOOGLE_PLACES_API_KEY=VOTRE_CLE python scrape_places_api_geneve.py
"""

import argparse
import csv
import json
import os
import sys
import time
import urllib.request
import urllib.error
import urllib.parse


QUERIES = [
    # Ville de Genève
    "agence immobilière Genève",
    "régie immobilière Genève",
    # Communes
    "agence immobilière Carouge Genève",
    "agence immobilière Lancy",
    "agence immobilière Meyrin",
    "agence immobilière Vernier Genève",
    "agence immobilière Onex",
    "agence immobilière Thônex",
    "agence immobilière Chêne-Bougeries",
    "agence immobilière Plan-les-Ouates",
    "agence immobilière Grand-Saconnex",
    "agence immobilière Bernex Genève",
    "agence immobilière Veyrier",
    "agence immobilière Perly-Certoux",
    "agence immobilière Cologny",
    "agence immobilière Pregny-Chambésy",
    "agence immobilière Bellevue Genève",
    "agence immobilière Genthod",
    "agence immobilière Chêne-Bourg",
    "agence immobilière Satigny",
    "agence immobilière Confignon",
    "agence immobilière Aire-la-Ville",
    # Recherches génériques
    "agence immobilière Canton de Genève",
    "courtier immobilier Genève",
    "immobilier Genève Suisse",
]

PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"


def search_places(query: str, api_key: str) -> list[dict]:
    """Appelle l'API Places Text Search (New) et retourne les résultats."""
    body = json.dumps({
        "textQuery": query,
        "languageCode": "fr",
        "regionCode": "CH",
        "maxResultCount": 20,
    }).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": (
            "places.displayName,"
            "places.formattedAddress,"
            "places.nationalPhoneNumber,"
            "places.internationalPhoneNumber,"
            "places.websiteUri,"
            "places.id"
        ),
    }

    req = urllib.request.Request(PLACES_TEXT_SEARCH_URL, data=body, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        print(f"Erreur API ({e.code}) pour '{query}':", file=sys.stderr)
        print(f"  Réponse: {error_body}", file=sys.stderr)
        if e.code == 403:
            print(
                "  → Vérifiez que 'Places API (New)' est activée dans Google Cloud Console\n"
                "  → Vérifiez que la facturation est activée sur le projet",
                file=sys.stderr,
            )
        elif e.code == 400:
            print("  → La clé API est peut-être invalide ou le format de requête incorrect", file=sys.stderr)
        elif e.code == 429:
            print("  → Quota dépassé, réessayez plus tard", file=sys.stderr)
        return []
    except urllib.error.URLError as e:
        print(f"Erreur réseau pour '{query}': {e.reason}", file=sys.stderr)
        return []

    results = []
    for place in data.get("places", []):
        results.append({
            "nom": place.get("displayName", {}).get("text", ""),
            "adresse": place.get("formattedAddress", ""),
            "telephone": place.get("internationalPhoneNumber", "") or place.get("nationalPhoneNumber", ""),
            "site_web": place.get("websiteUri", ""),
        })
    return results


def scrape(api_key: str, output: str = "agences_immobilieres_geneve.csv"):
    """Lance toutes les recherches et écrit le CSV de manière incrémentale."""
    fieldnames = ["nom", "adresse", "telephone", "site_web"]
    seen_ids = set()
    count = 0

    with open(output, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";")
        writer.writeheader()

        for i, query in enumerate(QUERIES):
            print(f"[{i + 1}/{len(QUERIES)}] Recherche : '{query}'")
            results = search_places(query, api_key)

            for place in results:
                key = (place["nom"], place["adresse"])
                if key in seen_ids:
                    continue
                seen_ids.add(key)
                writer.writerow(place)
                f.flush()
                count += 1

            print(f"  → {len(results)} résultats ({count} uniques au total)")

            if i < len(QUERIES) - 1:
                time.sleep(0.5)

    print(f"\n{count} agences exportées → {output}")
    return count


def main():
    parser = argparse.ArgumentParser(
        description="Extraction agences immobilières Genève via Google Places API"
    )
    parser.add_argument(
        "--api-key",
        default=os.environ.get("GOOGLE_PLACES_API_KEY", ""),
        help="Clé API Google Places (ou variable GOOGLE_PLACES_API_KEY)",
    )
    parser.add_argument(
        "--output", "-o",
        default="agences_immobilieres_geneve.csv",
        help="Fichier CSV de sortie (défaut: agences_immobilieres_geneve.csv)",
    )
    args = parser.parse_args()

    if not args.api_key:
        print(
            "ERREUR : clé API manquante.\n"
            "Utilisez --api-key VOTRE_CLE ou définissez GOOGLE_PLACES_API_KEY.\n\n"
            "Pour obtenir une clé :\n"
            "  1. https://console.cloud.google.com/\n"
            "  2. Créez un projet → Activez 'Places API (New)'\n"
            "  3. Identifiants → Créer → Clé API",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"Clé API : {args.api_key[:8]}...{args.api_key[-4:]} ({len(args.api_key)} car.)")
    count = scrape(api_key=args.api_key, output=args.output)

    if count == 0:
        print("Aucun résultat extrait.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

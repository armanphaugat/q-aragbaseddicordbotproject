import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse


def get_sub_urls(url: str) -> dict:
    """
    Scrape all unique hyperlinks found on the given URL's page.

    Returns:
        {
            "base_url": str,
            "sub_urls": List[str],   # absolute, deduplicated, sorted
            "count": int,
            "error": str | None
        }
    """
    result = {"base_url": url, "sub_urls": [], "count": 0, "error": None}
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (compatible; Q-Arag-Bot/1.0; +https://github.com/armanphaugat)"
            )
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        seen: set[str] = set()
        sub_urls: list[str] = []

        for tag in soup.find_all("a", href=True):
            href = tag["href"].strip()
            if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
                continue
            absolute = urljoin(url, href)
            parsed = urlparse(absolute)
            if parsed.scheme not in ("http", "https"):
                continue
            normalised = absolute.rstrip("/")
            if normalised not in seen:
                seen.add(normalised)
                sub_urls.append(absolute)

        sub_urls.sort()
        result["sub_urls"] = sub_urls
        result["count"] = len(sub_urls)

    except requests.exceptions.Timeout:
        result["error"] = f"Request timed out for: {url}"
    except requests.exceptions.ConnectionError:
        result["error"] = f"Could not connect to: {url}"
    except requests.exceptions.HTTPError as e:
        result["error"] = f"HTTP error {e.response.status_code} for: {url}"
    except Exception as e:
        result["error"] = f"Unexpected error: {e}"

    return result
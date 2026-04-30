#!/usr/bin/env python3
"""
Download professional Instagram assets from a public profile.

The script uses Instagram's public web profile endpoint. It does not log in,
does not bypass private content, and filters out personal posts before saving
images and metadata.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


DEFAULT_INCLUDE = [
    "botox",
    "toxina",
    "hiperidrose",
    "full face",
    "envelhecimento",
    "rejuvenescimento",
    "peptideo",
    "peptideos",
    "colageno",
    "regeneracao",
    "celular",
    "pele",
    "qualidade de pele",
    "estetica",
    "harmonizacao",
    "preenchimento",
    "bioestimulador",
    "skinbooster",
    "saude",
    "beleza natural",
]

DEFAULT_EXCLUDE = [
    "meus amores",
    "casamento",
    "myself",
    "familia",
    "mae",
    "esposa",
    "aniversario",
    "ferias",
    "viagem",
    "patrocinando",
    "evento lindo",
]

APP_ID = "936619743392459"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


@dataclass
class SelectedPost:
    shortcode: str
    taken_at: str | None
    caption: str
    matched_terms: list[str]
    image_urls: list[str]


def normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value)
    without_accents = "".join(char for char in decomposed if unicodedata.category(char) != "Mn")
    return without_accents.lower()


def slugify(value: str) -> str:
    clean = normalize(value)
    clean = re.sub(r"[^a-z0-9]+", "-", clean).strip("-")
    return clean or "instagram-post"


def strip_control_chars(value: str) -> str:
    return "".join(
        char
        for char in value
        if unicodedata.category(char)[0] != "C" or char in "\n\r\t"
    )


def safe_print(value: str) -> None:
    text = strip_control_chars(value)
    print(text.encode(sys.stdout.encoding or "utf-8", errors="replace").decode(sys.stdout.encoding or "utf-8"))


def http_json(url: str) -> dict[str, Any]:
    req = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json,text/plain,*/*",
            "X-IG-App-ID": APP_ID,
            "Referer": "https://www.instagram.com/",
        },
    )
    with urlopen(req, timeout=30) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return json.loads(response.read().decode(charset))


def http_download(url: str, destination: Path) -> None:
    req = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Referer": "https://www.instagram.com/",
        },
    )
    with urlopen(req, timeout=45) as response:
        destination.write_bytes(response.read())


def profile_url(username: str) -> str:
    return f"https://www.instagram.com/api/v1/users/web_profile_info/?username={quote(username)}"


def feed_url(username: str, count: int, max_id: str | None = None) -> str:
    url = f"https://www.instagram.com/api/v1/feed/user/{quote(username)}/username/?count={count}"
    if max_id:
        url += f"&max_id={quote(max_id)}"
    return url


def caption_from_node(node: dict[str, Any]) -> str:
    rest_caption = node.get("caption")
    if isinstance(rest_caption, dict) and rest_caption.get("text"):
        return rest_caption["text"]

    edges = node.get("edge_media_to_caption", {}).get("edges", [])
    if not edges:
        return ""
    return edges[0].get("node", {}).get("text", "") or ""


def image_urls_from_node(node: dict[str, Any], include_sidecar_children: bool) -> list[str]:
    urls: list[str] = []
    candidates = node.get("image_versions2", {}).get("candidates", [])
    if candidates:
        urls.append(candidates[0]["url"])

    display_url = node.get("display_url")
    if display_url and display_url not in urls:
        urls.append(display_url)

    if include_sidecar_children:
        carousel_items = node.get("carousel_media") or []
        for child in carousel_items:
            child_candidates = child.get("image_versions2", {}).get("candidates", [])
            if child_candidates:
                child_url = child_candidates[0]["url"]
                if child_url not in urls:
                    urls.append(child_url)

        children = node.get("edge_sidecar_to_children", {}).get("edges", [])
        for child in children:
            child_url = child.get("node", {}).get("display_url")
            if child_url and child_url not in urls:
                urls.append(child_url)

    return urls


def should_select(caption: str, include_terms: list[str], exclude_terms: list[str]) -> tuple[bool, list[str]]:
    normalized_caption = normalize(caption)
    if any(term in normalized_caption for term in exclude_terms):
        return False, []
    matched = [term for term in include_terms if term in normalized_caption]
    return bool(matched), matched


def collect_posts(
    nodes: list[dict[str, Any]],
    include_terms: list[str],
    exclude_terms: list[str],
    include_sidecar_children: bool,
    limit: int,
) -> list[SelectedPost]:
    selected: list[SelectedPost] = []

    for node in nodes:
        caption = caption_from_node(node)
        keep, matched_terms = should_select(caption, include_terms, exclude_terms)
        if not keep:
            continue

        timestamp = node.get("taken_at_timestamp") or node.get("taken_at")
        taken_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(timestamp)) if timestamp else None
        image_urls = image_urls_from_node(node, include_sidecar_children)
        if not image_urls:
            continue

        selected.append(
            SelectedPost(
                shortcode=node.get("shortcode") or node.get("code") or "unknown",
                taken_at=taken_at,
                caption=caption,
                matched_terms=matched_terms,
                image_urls=image_urls,
            )
        )

        if len(selected) >= limit:
            break

    return selected


def nodes_from_profile_payload(payload: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    user = payload.get("data", {}).get("user") or {}
    edges = user.get("edge_owner_to_timeline_media", {}).get("edges", [])
    return user, [edge.get("node", {}) for edge in edges]


def fetch_feed_nodes(username: str, pages: int, count: int, delay_seconds: float) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    profile_payload = http_json(profile_url(username))
    user, profile_nodes = nodes_from_profile_payload(profile_payload)
    nodes_by_code: dict[str, dict[str, Any]] = {}
    for node in profile_nodes:
        code = node.get("shortcode") or node.get("code") or node.get("id")
        if code:
            nodes_by_code[code] = node

    max_id: str | None = None
    for page in range(pages):
        feed_payload = http_json(feed_url(username, count=count, max_id=max_id))
        for item in feed_payload.get("items", []):
            code = item.get("code") or item.get("shortcode") or item.get("id")
            if code:
                nodes_by_code[code] = item

        max_id = feed_payload.get("next_max_id")
        if not feed_payload.get("more_available") or not max_id:
            break
        if page < pages - 1 and delay_seconds > 0:
            time.sleep(delay_seconds)

    return user, list(nodes_by_code.values())


def write_manifest(output_dir: Path, username: str, posts: list[dict[str, Any]], source: dict[str, Any]) -> None:
    manifest = {
        "username": username,
        "source": {
            "fullName": source.get("full_name"),
            "biography": source.get("biography"),
            "category": source.get("category_name"),
            "followers": source.get("edge_followed_by", {}).get("count"),
            "profileUrl": f"https://www.instagram.com/{username}/",
        },
        "posts": posts,
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Download professional Instagram posts from a public profile.")
    parser.add_argument("--username", default="dramarceladuch", help="Instagram username.")
    parser.add_argument("--output", default="apps/web/src/assets/instagram", help="Output directory.")
    parser.add_argument("--limit", type=int, default=12, help="Maximum selected professional posts.")
    parser.add_argument("--pages", type=int, default=8, help="Maximum feed pages to scan.")
    parser.add_argument("--page-size", type=int, default=12, help="Posts requested per feed page.")
    parser.add_argument("--delay", type=float, default=0.6, help="Delay between paginated requests.")
    parser.add_argument("--include", nargs="*", default=DEFAULT_INCLUDE, help="Normalized terms to include.")
    parser.add_argument("--exclude", nargs="*", default=DEFAULT_EXCLUDE, help="Normalized terms to exclude.")
    parser.add_argument("--first-image-only", action="store_true", help="Do not download sidecar child images.")
    parser.add_argument("--dry-run", action="store_true", help="Print selected posts without downloading images.")
    args = parser.parse_args()

    include_terms = [normalize(term) for term in args.include]
    exclude_terms = [normalize(term) for term in args.exclude]
    output_dir = Path(args.output)

    try:
        user, nodes = fetch_feed_nodes(
            args.username,
            pages=args.pages,
            count=args.page_size,
            delay_seconds=args.delay,
        )
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        print(f"Failed to fetch Instagram profile: {exc}", file=sys.stderr)
        return 1

    if not user:
        print("Instagram profile payload did not contain user data.", file=sys.stderr)
        return 1

    posts = collect_posts(
        nodes,
        include_terms=include_terms,
        exclude_terms=exclude_terms,
        include_sidecar_children=not args.first_image_only,
        limit=args.limit,
    )

    if args.dry_run:
        for post in posts:
            safe_print(f"{post.shortcode} | {post.taken_at} | terms={', '.join(post.matched_terms)}")
            first_line = strip_control_chars(post.caption).splitlines()[0] if post.caption else ""
            safe_print(first_line[:160])
        print(f"Selected {len(posts)} professional posts.")
        return 0

    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_posts: list[dict[str, Any]] = []

    for post in posts:
        cleaned_caption = strip_control_chars(post.caption)
        first_line = cleaned_caption.splitlines()[0] if cleaned_caption else ""
        post_slug = slugify(first_line[:80] or post.shortcode)
        files: list[str] = []

        for index, image_url in enumerate(post.image_urls, start=1):
            suffix = f"-{index}" if len(post.image_urls) > 1 else ""
            file_name = f"{post_slug}{suffix}.jpg"
            destination = output_dir / file_name
            http_download(image_url, destination)
            files.append(file_name)
            print(f"Downloaded {file_name}")

        manifest_posts.append(
            {
                "shortcode": post.shortcode,
                "permalink": f"https://www.instagram.com/p/{post.shortcode}/",
                "takenAt": post.taken_at,
                "matchedTerms": post.matched_terms,
                "caption": post.caption,
                "files": files,
            }
        )

    write_manifest(output_dir, args.username, manifest_posts, user)
    print(f"Saved manifest with {len(manifest_posts)} posts to {output_dir / 'manifest.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

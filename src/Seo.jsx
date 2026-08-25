import { useEffect } from "react";
import { pageMeta, pageUrl, SITE, socialJsonLd } from "./siteMeta";

function upsertMeta(selector, attributes) {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("meta");
    document.head.appendChild(node);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    node.setAttribute(key, value);
  });
}

function upsertLink(rel, href) {
  let node = document.head.querySelector(`link[rel="${rel}"]`);
  if (!node) {
    node = document.createElement("link");
    node.setAttribute("rel", rel);
    document.head.appendChild(node);
  }
  node.setAttribute("href", href);
}

export default function Seo({ route }) {
  useEffect(() => {
    const meta = pageMeta(route);
    const url = pageUrl(route);
    const image = `${SITE.url}${SITE.image}`;

    document.title = meta.title;
    upsertMeta('meta[name="description"]', { name: "description", content: meta.description });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: meta.title });
    upsertMeta('meta[property="og:description"]', {
      property: "og:description",
      content: meta.description,
    });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: url });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: meta.title });
    upsertMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: meta.description,
    });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });
    upsertLink("canonical", url);

    let json = document.getElementById("medihome-jsonld");
    if (!json) {
      json = document.createElement("script");
      json.id = "medihome-jsonld";
      json.type = "application/ld+json";
      document.head.appendChild(json);
    }
    json.textContent = JSON.stringify(socialJsonLd());
  }, [route]);

  return null;
}

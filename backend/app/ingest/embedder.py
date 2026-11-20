from __future__ import annotations

import hashlib
import math
import random
from typing import Sequence

import structlog
from google import genai
from google.genai import types

from app.config import settings

logger = structlog.get_logger(__name__)


def _normalize_vector(vec: Sequence[float]) -> list[float]:
    """Normalize a vector to unit length for consistent cosine similarity."""
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


def _generate_mock_embedding(text: str, dim: int = 1536) -> list[float]:
    """Generate a deterministic, unit-normalized float vector from text hash."""
    seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest(), 16) % (2**32)
    rng = random.Random(seed)
    vec = [rng.gauss(0, 1) for _ in range(dim)]
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [round(x / norm, 6) for x in vec]


def generate_embeddings(
    texts: Sequence[str],
    *,
    batch_size: int = 64,
) -> list[list[float]]:
    """Generate embeddings using Gemini (gemini-embedding-2) at the configured dimension,

    falling back to deterministic mock vectors when GEMINI_API_KEY is unset (or when
    ALLOW_MOCK_FALLBACK=true on transient API failures).
    """
    if not texts:
        return []

    api_key = settings.gemini_api_key
    if not api_key or api_key.startswith("your-") or api_key == "mock":
        logger.warning(
            "GEMINI_API_KEY is not configured; using deterministic mock embeddings.",
            count=len(texts),
            dimensions=settings.embedding_dimension,
        )
        return [_generate_mock_embedding(t, settings.embedding_dimension) for t in texts]

    client = genai.Client(api_key=api_key)
    results: list[list[float]] = []

    try:
        for i in range(0, len(texts), batch_size):
            batch = list(texts[i : i + batch_size])
            response = client.models.embed_content(
                model=settings.embedding_model,
                contents=batch,
                config=types.EmbedContentConfig(
                    output_dimensionality=settings.embedding_dimension,
                ),
            )
            if not response.embeddings or len(response.embeddings) != len(batch):
                raise RuntimeError("Gemini embeddings response count did not match input batch size.")
            results.extend([_normalize_vector(item.values) for item in response.embeddings])
        return results
    except Exception as exc:
        if settings.allow_mock_fallback:
            logger.warning(
                "Gemini embeddings call failed; falling back to deterministic mock vectors.",
                error=str(exc),
                count=len(texts),
            )
            return [_generate_mock_embedding(t, settings.embedding_dimension) for t in texts]
        logger.error(
            "Gemini embeddings call failed.",
            error=str(exc),
            count=len(texts),
        )
        raise


def embed_query(query: str) -> list[float]:
    """Generate embedding for a single search query."""
    return generate_embeddings([query])[0]

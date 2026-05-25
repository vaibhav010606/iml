import numpy as np
import io
import uuid
import pymupdf  # fitz
from sentence_transformers import SentenceTransformer

# Load a lightweight model
# For production, we'd use a more robust model, but all-MiniLM-L6-v2 is fast and small.
embedder = SentenceTransformer('all-MiniLM-L6-v2')

SESSION_CACHE = {}

def extract_text(file_bytes: bytes, filename: str) -> str:
    if filename.endswith('.pdf'):
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    else:
        return file_bytes.decode('utf-8', errors='ignore')

def chunk_text(text: str, chunk_size: int = 500) -> list[str]:
    words = text.split()
    chunks = [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]
    return chunks

def turboquant_pipeline(text: str):
    # Step 1: Tokenize & Embed
    chunks = chunk_text(text)
    if not chunks:
        chunks = ["empty"]
    
    # Generate FP16 embeddings
    embeddings = embedder.encode(chunks, convert_to_numpy=True)
    embeddings = embeddings.astype(np.float16)
    
    n_samples, n_dims = embeddings.shape
    
    # Original Size (FP16)
    original_size_bytes = embeddings.nbytes
    
    # --- STAGE 1: PolarQuant ---
    # Random orthogonal rotation using QR
    np.random.seed(42)
    H = np.random.randn(n_dims, n_dims)
    Q, _ = np.linalg.qr(H)
    
    # Apply rotation
    rotated = embeddings @ Q
    
    # Polar Mapping & Binning
    # For a highly simplified version, we can think of quantization:
    # Scale to 0-1, map to 3 bits (8 levels)
    # The actual algorithm might separate magnitude and angles precisely.
    # Here, we do a simplified simulation of polar mapping:
    # For each vector, get magnitude
    magnitudes = np.linalg.norm(rotated, axis=1, keepdims=True)
    
    # Normalize to get directions (angles on hypersphere)
    directions = rotated / (magnitudes + 1e-8)
    
    # Quantize directions to 3 bits (0 to 7)
    # Directions are in [-1, 1]. Map to [0, 7]
    dir_scaled = (directions + 1.0) / 2.0  # [0, 1]
    dir_quantized_3bit = np.clip(np.round(dir_scaled * 7), 0, 7).astype(np.uint8)
    
    # Reconstruct from 3-bit
    dir_reconstructed = (dir_quantized_3bit / 7.0) * 2.0 - 1.0
    reconstructed_stage1 = dir_reconstructed * magnitudes
    
    mse_stage1 = float(np.mean((rotated - reconstructed_stage1) ** 2))
    
    # --- STAGE 2: QJL Error Correction ---
    # Residual error
    residual = rotated - reconstructed_stage1
    
    # Johnson-Lindenstrauss Random Projection (using a simple random matrix)
    # We can project into lower or same subspace. Here we do same subspace to match dims
    # The 1-bit sign matrix cancels bias
    JL = np.random.randn(n_dims, n_dims) / np.sqrt(n_dims)
    projected_residual = residual @ JL
    
    # 1-bit sign encoding
    sign_matrix = np.sign(projected_residual).astype(np.int8)
    
    # --- Packing & Sizes ---
    # We have 3-bit polar data + 1-bit QJL data = 4-bit per dimension
    # So 4 bits = 0.5 bytes per dimension
    compressed_size_bytes = int(n_samples * n_dims * 0.5)
    
    # Store session for searching
    session_id = str(uuid.uuid4())
    
    unscaled_reconstructed_residual = sign_matrix @ np.linalg.pinv(JL)
    norm_true = np.linalg.norm(residual, axis=1, keepdims=True)
    norm_rec = np.linalg.norm(unscaled_reconstructed_residual, axis=1, keepdims=True)
    # Scale the reconstructed residual to match the magnitude of the actual residual
    reconstructed_residual = unscaled_reconstructed_residual * (norm_true / (norm_rec + 1e-8)) * 0.5
    
    final_reconstructed = reconstructed_stage1 + reconstructed_residual
    
    mse = float(np.mean((rotated - final_reconstructed) ** 2))
    
    SESSION_CACHE[session_id] = {
        "chunks": chunks,
        "embeddings": embeddings,
        "rotated": rotated,
        "magnitudes": magnitudes,
        "directions": directions,
        "JL": JL,
        "final_reconstructed": final_reconstructed,
        "Q": Q
    }
    
    return {
        "session_id": session_id,
        "original_size": original_size_bytes,
        "compressed_size": compressed_size_bytes,
        "ratio": original_size_bytes / (compressed_size_bytes + 1e-8),
        "mse_stage1": mse_stage1,
        "mse": mse,
        "samples": {
            "raw_fp16": embeddings[0, :5].tolist(),
            "rotated": rotated[0, :5].tolist(),
            "quantized_3bit": dir_quantized_3bit[0, :5].tolist(),
            "residual": residual[0, :5].tolist(),
            "qjl_1bit": sign_matrix[0, :5].tolist()
        }
    }

def search_pipeline(session_id: str, query: str, top_k: int = 3):
    if session_id not in SESSION_CACHE:
        raise ValueError("Session not found")
        
    session = SESSION_CACHE[session_id]
    chunks = session["chunks"]
    final_reconstructed = session["final_reconstructed"]
    Q = session["Q"]
    
    # Embed query
    query_emb = embedder.encode([query], convert_to_numpy=True).astype(np.float16)
    
    # Rotate query to match compressed space
    query_rotated = query_emb @ Q
    
    # Compute dot products (inner product search)
    scores = np.dot(final_reconstructed, query_rotated.T).flatten()
    
    # Get top k
    top_indices = np.argsort(scores)[::-1][:top_k]
    
    results = []
    for idx in top_indices:
        results.append({
            "chunk": chunks[idx],
            "score": float(scores[idx])
        })
        
    return results

def recalculate_pipeline(session_id: str, total_bits: int):
    if session_id not in SESSION_CACHE:
        raise ValueError("Session not found")
        
    session = SESSION_CACHE[session_id]
    rotated = session["rotated"]
    embeddings = session["embeddings"]
    magnitudes = session["magnitudes"]
    directions = session["directions"]
    JL = session["JL"]
    n_samples, n_dims = rotated.shape
    
    polar_bits = max(1, total_bits - 1)
    levels = 2 ** polar_bits
    
    dir_scaled = (directions + 1.0) / 2.0
    dir_quantized = np.clip(np.round(dir_scaled * (levels - 1)), 0, levels - 1).astype(np.uint8)
    dir_reconstructed = (dir_quantized / float(levels - 1)) * 2.0 - 1.0
    reconstructed_stage1 = dir_reconstructed * magnitudes
    
    mse_stage1 = float(np.mean((rotated - reconstructed_stage1) ** 2))
    
    residual = rotated - reconstructed_stage1
    projected_residual = residual @ JL
    sign_matrix = np.sign(projected_residual).astype(np.int8)
    
    unscaled_reconstructed_residual = sign_matrix @ np.linalg.pinv(JL)
    norm_true = np.linalg.norm(residual, axis=1, keepdims=True)
    norm_rec = np.linalg.norm(unscaled_reconstructed_residual, axis=1, keepdims=True)
    reconstructed_residual = unscaled_reconstructed_residual * (norm_true / (norm_rec + 1e-8)) * 0.5
    
    final_reconstructed = reconstructed_stage1 + reconstructed_residual
    
    session["final_reconstructed"] = final_reconstructed
    
    original_size_bytes = embeddings.nbytes
    compressed_size_bytes = int(n_samples * n_dims * (total_bits / 8.0))
    mse = float(np.mean((rotated - final_reconstructed) ** 2))
    
    return {
        "original_size": original_size_bytes,
        "compressed_size": compressed_size_bytes,
        "ratio": original_size_bytes / (compressed_size_bytes + 1e-8),
        "mse_stage1": mse_stage1,
        "mse": mse,
        "samples": {
            "raw_fp16": embeddings[0, :5].tolist(),
            "rotated": rotated[0, :5].tolist(),
            "quantized_3bit": dir_quantized[0, :5].tolist(),
            "qjl_1bit": sign_matrix[0, :5].tolist()
        }
    }

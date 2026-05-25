from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from turboquant import extract_text, turboquant_pipeline, search_pipeline

app = FastAPI(title="TurboQuant API")

class SearchRequest(BaseModel):
    session_id: str
    query: str

class RecalculateRequest(BaseModel):
    session_id: str
    total_bits: int

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith(('.txt', '.pdf')):
        raise HTTPException(status_code=400, detail="Only .txt and .pdf files are supported")
    
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File is empty")
        
    try:
        text = extract_text(content, file.filename)
        results = turboquant_pipeline(text)
        
        return {
            "status": "success",
            "filename": file.filename,
            "original_byte_count": len(content),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
async def search(req: SearchRequest):
    try:
        results = search_pipeline(req.session_id, req.query)
        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/recalculate")
async def recalculate(req: RecalculateRequest):
    try:
        from turboquant import recalculate_pipeline
        results = recalculate_pipeline(req.session_id, req.total_bits)
        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

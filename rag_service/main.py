from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from langchain_community.document_loaders import BSHTMLLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
import chromadb
import os

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ChromaDB
chroma_client = chromadb.PersistentClient(path="./data/chromadb")

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Save file temporarily
    file_path = f"./temp/{file.filename}"
    os.makedirs("./temp", exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    try:
        # Load HTML file
        loader = BSHTMLLoader(file_path)
        documents = loader.load()
        
        # Split into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            separators=["\n\n", "\n", " ", ""]
        )
        chunks = text_splitter.split_documents(documents)
        
        # Create embeddings
        embeddings = HuggingFaceEmbeddings()
        
        # Store in ChromaDB
        collection = chroma_client.get_or_create_collection(
            name="vst_docs",
            embedding_function=embeddings
        )
        
        # Add documents to collection
        for i, chunk in enumerate(chunks):
            collection.add(
                documents=[chunk.page_content],
                ids=[f"{file.filename}-{i}"],
                metadatas=[{"source": file.filename}]
            )
            
        return {"message": f"Processed {len(chunks)} chunks from {file.filename}"}
        
    finally:
        # Clean up temp file
        if os.path.exists(file_path):
            os.remove(file_path) 
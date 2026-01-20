import React, { useState, useRef } from 'react';
import './ImageUploader.css';

interface ImageUploaderProps {
  currentImage?: string;
  onImageSelect: (imageDataUrl: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  currentImage, 
  onImageSelect 
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, SVG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      onImageSelect(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className={`image-uploader ${dragOver ? 'drag-over' : ''} ${preview ? 'has-preview' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      {preview ? (
        <div className="preview-container">
          <img src={preview} alt="Floor plan preview" className="preview-image" />
          <div className="preview-overlay">
            <span>Click or drop to replace</span>
          </div>
        </div>
      ) : (
        <div className="upload-placeholder">
          <div className="upload-icon">🗺️</div>
          <h3>Upload Floor Plan</h3>
          <p>Drag & drop an image or click to browse</p>
          <span className="formats">PNG, JPG, SVG supported</span>
        </div>
      )}
    </div>
  );
};

'use client';

import { useState, useRef, useEffect } from 'react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  accept?: string;
  apiUrl?: string;
}

export default function ImageUpload({ value, onChange, label = 'Image', accept = 'image/*', apiUrl }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const baseApiUrl = apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Update preview when value changes (for editing existing items)
  useEffect(() => {
    if (value) {
      setPreview(value);
    } else {
      setPreview(null);
    }
  }, [value]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET || '';
      const response = await fetch(`${baseApiUrl}/api/media/upload`, {
        method: 'POST',
        headers: {
          'x-admin-key': adminSecret,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.ok && data.url) {
        const uploadedUrl = data.url.startsWith('http') ? data.url : `${baseApiUrl}${data.url}`;
        onChange(data.url); // Save the relative URL
        setPreview(uploadedUrl); // Show full URL for preview
      } else {
        alert(data.error || 'Failed to upload image');
        setPreview(value || null); // Revert to previous value
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert('Failed to upload image: ' + error.message);
      setPreview(value || null); // Revert to previous value
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('data:')) return url; // Data URL from FileReader
    if (url.startsWith('/')) return `${baseApiUrl}${url}`;
    return `${baseApiUrl}/${url}`;
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>{label}</label>
      
      {preview && (
        <div style={{ marginBottom: '12px', position: 'relative', display: 'inline-block' }}>
          <img
            src={getImageUrl(preview) || ''}
            alt="Preview"
            style={{
              maxWidth: '200px',
              maxHeight: '200px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              objectFit: 'cover',
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={handleRemove}
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: 'rgba(255, 0, 0, 0.8)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
      )}

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={uploading}
          style={{ display: 'none' }}
          id={`image-upload-${label.replace(/\s+/g, '-')}`}
        />
        <label
          htmlFor={`image-upload-${label.replace(/\s+/g, '-')}`}
          style={{
            padding: '8px 16px',
            background: uploading ? '#ccc' : '#8B4513',
            color: 'white',
            borderRadius: '4px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'inline-block',
          }}
        >
          {uploading ? 'Uploading...' : preview ? 'Change Image' : 'Pick Image'}
        </label>
      </div>
    </div>
  );
}


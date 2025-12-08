'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function BatchImportCard() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      // Basic validation for file type could be added here
      // e.g., if (!['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(selectedFile.type)) { ... }
      setFile(selectedFile);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files ? e.target.files[0] : null);
  };
  
  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files ? e.dataTransfer.files[0] : null);
  }, []);
  
  const handleRemoveFile = () => {
      setFile(null);
  }

  const handleUpload = () => {
    if (!file) return;
    toast({
        title: "Upload Started",
        description: `Uploading ${file.name}... (This is a placeholder)`,
    });
    // Placeholder for actual upload logic
    console.log("Uploading file:", file);
  };

  return (
    <Card
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={cn("transition-colors", isDragging ? "border-primary bg-primary/10" : "")}
    >
      <CardHeader>
        <CardTitle>Batch Import</CardTitle>
        <CardDescription>Import products in bulk using an Excel or CSV file.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4 text-center border-2 border-dashed border-muted-foreground/30 rounded-lg p-12">
        <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
        {file ? (
            <div className="flex flex-col items-center gap-4">
                <FileText className="w-12 h-12 text-primary" />
                <p className="font-medium">{file.name}</p>
                <div className="flex gap-2">
                    <Button onClick={handleUpload}>Upload File</Button>
                    <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
                        <X className="w-4 h-4"/>
                    </Button>
                </div>
            </div>
        ) : (
          <>
            <div className={cn("p-3 bg-muted rounded-full transition-colors", isDragging ? 'bg-primary/20' : '')}>
              <Upload className={cn("w-8 h-8 text-muted-foreground transition-colors", isDragging ? 'text-primary' : '')} />
            </div>
            <p className="text-muted-foreground">
                {isDragging ? "Drop the file to upload" : "Drag & drop your file here or click to browse"}
            </p>
            <Button variant="outline" onClick={onButtonClick}>
              Select File
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

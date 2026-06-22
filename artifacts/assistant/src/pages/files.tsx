import { useState, useRef } from "react";
import { FolderOpen, Upload, File, ImageIcon, FileText, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type === "application/pdf" || type.startsWith("text/")) return FileText;
  return File;
}

export default function FilesPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  function handleFiles(fileList: FileList) {
    const newFiles: UploadedFile[] = [];
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

    for (const file of Array.from(fileList)) {
      if (file.size > MAX_SIZE) {
        toast({
          title: `Файл слишком большой: ${file.name}`,
          description: "Максимальный размер файла — 10 МБ",
          variant: "destructive",
        });
        continue;
      }
      const url = URL.createObjectURL(file);
      newFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url,
        uploadedAt: new Date(),
      });
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...newFiles, ...prev]);
      toast({ title: `Загружено файлов: ${newFiles.length}` });
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  function handleDelete(id: string) {
    setFiles(prev => {
      const f = prev.find(x => x.id === id);
      if (f) URL.revokeObjectURL(f.url);
      return prev.filter(x => x.id !== id);
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <FolderOpen size={16} className="text-primary" />
          <h1 className="text-base font-semibold text-foreground">Файлы</h1>
          {files.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {files.length}
            </span>
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Upload size={13} />
          Загрузить
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Drop zone / content */}
      <div
        className={cn(
          "flex-1 overflow-y-auto scrollbar-thin p-5 transition-colors",
          isDragging && "bg-primary/5"
        )}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {files.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center h-full min-h-48 border-2 border-dashed rounded-2xl transition-colors cursor-pointer",
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <Upload size={22} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Перетащите файлы сюда</p>
                <p className="text-xs text-muted-foreground mt-1">или нажмите для выбора. До 10 МБ на файл.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {isDragging && (
              <div className="flex items-center justify-center h-20 border-2 border-dashed border-primary rounded-xl bg-primary/5 mb-4">
                <p className="text-sm text-primary font-medium">Отпустите для загрузки</p>
              </div>
            )}
            {files.map(file => {
              const Icon = getFileIcon(file.type);
              const isImage = file.type.startsWith("image/");
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors group"
                >
                  {/* Preview */}
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {isImage ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Icon size={18} className="text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(file.size)} · {file.uploadedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={file.url}
                      download={file.name}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Download size={14} />
                    </a>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

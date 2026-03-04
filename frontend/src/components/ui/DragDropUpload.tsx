import { useState, useRef, useCallback } from 'react';
import { UploadCloud, X, CheckCircle } from 'lucide-react';

interface DragDropUploadProps {
    accept: string;
    file: File | null;
    onFileChange: (file: File | null) => void;
    label?: string;
    hint?: string;
    required?: boolean;
}

const DragDropUpload = ({ accept, file, onFileChange, label, hint }: DragDropUploadProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
            const ext = '.' + droppedFile.name.split('.').pop()?.toLowerCase();
            const isValid = acceptedTypes.some(t => ext === t || droppedFile.type.includes(t.replace('.', '')));
            if (isValid || acceptedTypes.includes('*')) {
                onFileChange(droppedFile);
            } else {
                alert(`Invalid file type. Accepted: ${accept}`);
            }
        }
    }, [accept, onFileChange]);

    const handleClick = () => {
        fileRef.current?.click();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        onFileChange(selectedFile);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onFileChange(null);
    };

    return (
        <div
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
                relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center text-center 
                cursor-pointer transition-all duration-300 group overflow-hidden
                ${isDragging
                    ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 scale-[1.01] shadow-lg shadow-indigo-500/10'
                    : file
                        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10'
                }
            `}
        >
            <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={handleInputChange}
                accept={accept}
            />

            {/* Decorative gradient corners */}
            <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-tl-2xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-violet-500/5 to-transparent rounded-br-2xl pointer-events-none" />

            {file ? (
                <>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                            <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{file.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="ml-2 p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 transition-all"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-3 font-medium">Click to replace or drag a new file</p>
                </>
            ) : (
                <>
                    <div className={`p-4 rounded-2xl mb-3 transition-all duration-300 ${isDragging ? 'bg-indigo-100 dark:bg-indigo-900/30 scale-110' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20'}`}>
                        <UploadCloud className={`h-8 w-8 transition-all duration-300 ${isDragging ? 'text-indigo-500 animate-bounce' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                    </div>
                    <span className={`text-sm font-semibold transition-colors ${isDragging ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {isDragging ? 'Drop file here!' : (label || 'Click to upload or drag & drop')}
                    </span>
                    {hint && <span className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">{hint}</span>}
                </>
            )}
        </div>
    );
};

export default DragDropUpload;

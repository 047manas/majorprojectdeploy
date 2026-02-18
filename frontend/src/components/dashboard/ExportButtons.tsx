import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { AnalyticsFilters } from '@/hooks/useAnalytics';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

interface ExportButtonsProps {
    filters: AnalyticsFilters;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ filters }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState<string | null>(null);

    const handleDownload = async (endpoint: string, filename: string, key: string) => {
        setLoading(key);
        try {
            const response = await api.get(endpoint, {
                params: filters,
                responseType: 'blob', // Important for file handling
            });

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Download failed:", error);
            // In a real app, show toast notification here
        } finally {
            setLoading(null);
        }
    };

    // Only Admin and Faculty can export
    if (!user || (user.role !== 'admin' && user.role !== 'faculty')) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('/analytics/export-naac?type=full', `NAAC_Full_Report.xlsx`, 'full')}
                disabled={!!loading}
            >
                {loading === 'full' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />}
                NAAC Accreditation Report
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('/analytics/export-snapshot', `Analytics_Snapshot.xlsx`, 'snapshot')}
                disabled={!!loading}
            >
                {loading === 'snapshot' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Snapshot
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('/analytics/export-students-table', `Student_List.xlsx`, 'students')}
                disabled={!!loading}
            >
                {loading === 'students' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Student List
            </Button>
        </div>
    );
};

export default ExportButtons;

import { useState, useEffect } from "react";
import { Download, FileText, Calendar, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface ExportFile {
  id: string;
  filename: string;
  projectName: string;
  date: string;
  sizeBytes: number;
  sizeKb: number;
  type: 'stl' | 'nifti' | 'npy';
}

export default function ExportsPage() {
  const [exports, setExports] = useState<ExportFile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  useEffect(() => {
    fetchExports();
  }, []);

  const fetchExports = async () => {
    try {
      const response = await axios.get(`${apiUrl}/list-segmentations`);
      const files = response.data.segmentations || [];
      
      const formattedExports: ExportFile[] = files
        .filter((f: any) => f.filename.endsWith('.stl') || f.filename.endsWith('.nii.gz'))
        .map((file: any, index: number) => ({
          id: index.toString(),
          filename: file.filename,
          projectName: file.filename.replace(/\.(stl|nii\.gz)$/, '').split('_').slice(0, 3).join('_'),
          date: new Date(file.modified).toISOString().split('T')[0],
          sizeBytes: file.size_bytes,
          sizeKb: file.size_kb,
          type: file.filename.endsWith('.stl') ? 'stl' : 'nifti'
        }));
      
      setExports(formattedExports);
    } catch (error) {
      console.error('Error fetching exports:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (filename: string) => {
    const endpoint = filename.endsWith('.stl') ? 'download-stl' : 'download-nifti';
    window.open(`${apiUrl}/${endpoint}/${filename}`, '_blank');
  };

  const viewInViewer = (filename: string) => {
    navigate(`/dashboard/viewer?file=${encodeURIComponent(filename)}`);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Exports</h1>
          <p className="text-sm text-muted-foreground">Loading your generated files...</p>
        </div>
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <div className="animate-pulse">Loading exports...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Exports</h1>
        <p className="text-sm text-muted-foreground">Download your generated STL and segmentation files</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Export History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {exports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No exported files yet</p>
              <p className="text-sm">Upload a CT scan and process it to generate models</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/dashboard/upload')}
              >
                Upload New Scan
              </Button>
            </div>
          ) : (
            exports.map((file) => (
              <div key={file.id} className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    file.type === 'stl' ? 'bg-blue-500/10' : 'bg-green-500/10'
                  }`}>
                    <FileText className={`h-5 w-5 ${
                      file.type === 'stl' ? 'text-blue-500' : 'text-green-500'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.filename}</p>
                    <p className="text-xs text-muted-foreground">{file.projectName}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {formatDate(file.date)} • {file.sizeKb.toFixed(1)} KB
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        file.type === 'stl' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'
                      }`}>
                        {file.type.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {file.type === 'stl' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => viewInViewer(file.filename)}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" /> View
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadFile(file.filename)}
                  >
                    <Download className="mr-1 h-3.5 w-3.5" /> Download
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
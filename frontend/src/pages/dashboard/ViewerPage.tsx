import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Eye, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import axios from 'axios';
import STLViewer from '../../components/STLViewer';
import ErrorBoundary from '../../components/ErrorBoundary';

interface StlFile {
  filename: string;
  size_kb: number;
}

export default function ViewerPage() {
  const [searchParams] = useSearchParams();
  const [stlUrl, setStlUrl] = useState<string>('');
  const [inputUrl, setInputUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [stlFiles, setStlFiles] = useState<StlFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [viewerKey, setViewerKey] = useState(0); 

  const filename = searchParams.get('file');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  const fetchStlFiles = async () => {
    setLoadingFiles(true);
    try {
      const response = await axios.get(`${apiUrl}/list-segmentations`);
      const allFiles = response.data.segmentations || [];
      setStlFiles(allFiles.filter((f: any) => f.filename.toLowerCase().endsWith('.stl')));
    } catch (err) {
      console.error('Failed to fetch STL files:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchStlFiles();
  }, []);

  useEffect(() => {
    if (filename) {
      const url = `${apiUrl}/download-stl/${filename}`;
      setInputUrl(url);
      setStlUrl(url);
    }
  }, [filename, apiUrl]);

  const handleLoadModel = () => {
    if (!inputUrl) return;
    setLoading(true);
    setError(null);
    setModelLoaded(false);
    setStlUrl(inputUrl);
    setViewerKey(prev => prev + 1);
  };

  const handleRetry = () => {
    setError(null);
    setViewerKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">3D Model Viewer</h1>
          <p className="text-sm text-muted-foreground">View and interact with generated STL models</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="shadow-card lg:col-span-3">
          <CardContent className="relative flex aspect-[16/10] items-center justify-center rounded-lg p-0 overflow-hidden bg-[#0a0a0f]">
            {stlUrl ? (
              <ErrorBoundary key={`eb-${viewerKey}`} onReset={handleRetry}>
                <STLViewer
                  key={`stl-${viewerKey}`}
                  stlUrl={stlUrl}
                  onLoad={() => { setLoading(false); setModelLoaded(true); }}
                  onError={(err) => { setLoading(false); setError(err.message); }}
                />
              </ErrorBoundary>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center p-8">
                <Box className="h-10 w-10 text-white/20" />
                <p className="text-sm font-medium text-white/50">No Model Loaded</p>
              </div>
            )}

            {modelLoaded && (
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-lg border border-white/10 bg-black/60 p-2 backdrop-blur-md">
                <Button variant="ghost" size="icon" onClick={() => window.open(stlUrl, '_blank')} title="Download">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleRetry} title="Reset View">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
          <div className="mt-3 text-center text-xs pt-4 text-muted-foreground pb-2">
            <span>🖱️ Drag to rotate • Right-click to pan • Scroll to zoom</span>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Control Panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">STL URL</Label>
                <Input
                  placeholder="URL to .stl file"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="text-xs"
                />
              </div>
              <Button onClick={handleLoadModel} disabled={loading} className="w-full">
                <Eye className="mr-2 h-4 w-4" /> Load Model
              </Button>
              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-[10px] leading-tight">{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Generated Files</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[300px] overflow-y-auto pt-0">
              {loadingFiles ? (
                <div className="text-center text-xs py-4">Loading list...</div>
              ) : stlFiles.length === 0 ? (
                <div className="text-center text-xs py-4 text-muted-foreground">No STL files found.</div>
              ) : (
                <div className="space-y-1">
                  {stlFiles.map((file) => (
                    <button
                      key={file.filename}
                      onClick={() => {
                        const url = `${apiUrl}/download-stl/${file.filename}`;
                        setInputUrl(url);
                        setStlUrl(url);
                        setViewerKey(k => k + 1);
                      }}
                      className="w-full text-left p-2 text-xs rounded hover:bg-accent flex justify-between items-center group"
                    >
                      <span className="truncate flex-1 mr-2">{file.filename}</span>
                      <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
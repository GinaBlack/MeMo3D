import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLang } from '../../../contexts/LangContext';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Download, Share2, FileText, Ruler, Package, Clock, Layers, Eye, RotateCcw, User, Activity, Calendar, HardDrive, AlertCircle } from 'lucide-react';
import axios from 'axios';
import STLViewer from '../../../components/STLViewer';
import ErrorBoundary from '../../../components/ErrorBoundary';

interface ProcessingResult {
  id: string;
  status: string;
  projectName: string;
  patientName: string;
  patientId: string;
  scanType: string;
  deviceType: string;
  volumeShape: number[];
  boneVolumePercentage: number;
  stlFile: string;
  niftiFile: string;
  createdAt: string;
  metadata?: any;
  meshStats?: {
    vertices: number;
    faces: number;
    volume: number;
    area: number;
    fileSizeKb: number;
  };
}

export function ResultsPage() {
  const { t } = useLang();
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stlLoaded, setStlLoaded] = useState(false);
  const [stlError, setStlError] = useState<string | null>(null);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  useEffect(() => {
    const fetchResult = async () => {
      try {
        // First try to get job result from backend
        const resultRes = await axios.get(`${apiUrl}/result/${id}`);
        const data = resultRes.data;
        
        // Also get list of segmentations to find STL file if not in result
        let stlFilename = data.stl_file;
        let niftiFilename = data.nifti_file;
        
        if (!stlFilename) {
          const listRes = await axios.get(`${apiUrl}/list-segmentations`);
          const segmentations = listRes.data.segmentations || [];
          const stlFiles = segmentations.filter((f: any) => f.filename.endsWith('.stl'));
          if (stlFiles.length > 0) stlFilename = stlFiles[0].filename;
          const niftiFiles = segmentations.filter((f: any) => f.filename.endsWith('.nii.gz'));
          if (niftiFiles.length > 0) niftiFilename = niftiFiles[0].filename;
        }
        
        // Retrieve stored processing info from sessionStorage (project name, etc.)
        const storedData = sessionStorage.getItem(`processing_${id}`);
        const stored = storedData ? JSON.parse(storedData) : {};
        
        // Metadata from result is flat (patient_name, modality, etc.)
        const metadata = data.metadata || {};
        
        setResult({
          id: id || '',
          status: 'completed',
          projectName: stored.projectName || 'CT Scan Result',
          patientName: metadata.patient_name || stored.patientName || 'Unknown',
          patientId: metadata.patient_id || stored.patientId || 'Unknown',
          scanType: metadata.modality || stored.scanType || 'CT',
          deviceType: stored.deviceType || 'Splint',
          volumeShape: data.volume_info?.shape || [0, 0, 0],
          boneVolumePercentage: data.segmentation_info?.bone_volume_percentage || 0,
          stlFile: stlFilename || '',
          niftiFile: niftiFilename || '',
          createdAt: stored.createdAt || new Date().toISOString(),
          metadata: metadata,
          meshStats: data.mesh_stats
        });
      } catch (err) {
        console.error('Error fetching result:', err);
        setError('Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchResult();
    }
  }, [id, apiUrl]);

  const stlUrl = result?.stlFile ? `${apiUrl}/download-stl/${encodeURIComponent(result.stlFile)}` : '';
  const niftiUrl = result?.niftiFile ? `${apiUrl}/download-nifti/${encodeURIComponent(result.niftiFile)}` : '';

  const handleDownloadSTL = async () => {
    if (!stlUrl) return;
    try {
      const response = await fetch(stlUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result?.stlFile || 'model.stl';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDownloadNifti = async () => {
    if (!niftiUrl) return;
    try {
      const response = await fetch(niftiUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result?.niftiFile || 'segmentation.nii.gz';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  const formatFileSize = (kb: number) => {
    if (!kb) return 'N/A';
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RotateCcw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">No Results Found</h2>
          <p className="text-muted-foreground">{error || 'The processing result could not be found.'}</p>
          <Link to="/dashboard/upload">
            <Button className="mt-4">Upload New Scan</Button>
          </Link>
        </div>
      </div>
    );
  }

  const modelDetails = [
    {
      icon: Ruler,
      label: 'Dimensions',
      value: result.volumeShape && result.volumeShape.length === 3 
        ? `${result.volumeShape[1]} × ${result.volumeShape[2]} × ${result.volumeShape[0]} px` 
        : 'N/A',
    },
    {
      icon: Package,
      label: 'Bone Volume',
      value: result.boneVolumePercentage ? `${result.boneVolumePercentage.toFixed(1)}%` : 'N/A',
    },
    {
      icon: Layers,
      label: 'Total Slices',
      value: result.volumeShape?.[0] || 'N/A',
    },
    {
      icon: Clock,
      label: 'Created',
      value: formatDate(result.createdAt),
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2">
      <div className="min-h-screen mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            {t.results.title || 'Processing Results'}
          </h1>
          <p className="text-lg text-muted-foreground">
            Patient: {result.patientName} (ID: {result.patientId})
          </p>
          <div className="mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              {result.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: 3D Model Preview */}
          <div className="lg:col-span-2 w-full overflow-hidden">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{t.results.preview || '3D Model Preview'}</CardTitle>
                <CardDescription>Interactive 3D model viewer - drag to rotate, scroll to zoom</CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div 
                  className="relative w-full bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/20 rounded-lg overflow-hidden border border-border"
                  style={{ height: '550px', maxHeight: '70vh' }}
                >
                  {stlUrl ? (
                    <>
                      <ErrorBoundary fallback={<div className="p-4 text-center">3D viewer unavailable</div>}>
                        <STLViewer
                          stlUrl={stlUrl}
                          backgroundColor="#ffffff"
                          color="#3b82f6"
                          onLoad={() => {
                            setStlLoaded(true);
                            setStlError(null);
                          }}
                          onError={(err) => {
                            setStlError(err.message);
                            setStlLoaded(false);
                          }}
                        />
                      </ErrorBoundary>
                      {!stlLoaded && !stlError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <div className="text-center">
                            <RotateCcw className="h-8 w-8 animate-spin mx-auto mb-2 text-white" />
                            <p className="text-sm text-white">Loading 3D model...</p>
                          </div>
                        </div>
                      )}
                      {stlError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <div className="text-center text-red-500 p-4">
                            <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                            <p className="text-sm">Failed to load model: {stlError}</p>
                            <Button variant="outline" size="sm" className="mt-2" onClick={handleDownloadSTL}>
                              <Download className="h-4 w-4 mr-2" />
                              Download STL to view locally
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-muted-foreground">STL file not available</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 text-center text-xs text-muted-foreground pb-2">
                  <span>🖱️ Drag to rotate • Right-click to pan • Scroll to zoom</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Details & Actions */}
          <div className="space-y-6 lg:sticky lg:top-4">
            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>{t.results.details || 'Model Details'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {modelDetails.map((detail, index) => {
                    const Icon = detail.icon;
                    return (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground">{detail.label}</p>
                          <p className="font-semibold">{detail.value}</p>
                        </div>
                      </div>
                    );
                  })}
                  {result.meshStats && (
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0">
                        <HardDrive className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">File Size</p>
                        <p className="font-semibold text-sm">{formatFileSize(result.meshStats.fileSizeKb)}</p>
                        <p className="text-xs text-muted-foreground">
                          {result.meshStats.vertices.toLocaleString()} vertices • {result.meshStats.faces.toLocaleString()} faces
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Simple Metadata Card (using flat metadata) */}
            {result.metadata && (
              <Card>
                <CardHeader>
                  <CardTitle>Patient Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Patient Name</p>
                        <p className="text-sm font-medium">{result.metadata.patient_name || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Modality</p>
                        <p className="text-sm font-medium">{result.metadata.modality || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Study Date</p>
                        <p className="text-sm font-medium">{result.metadata.study_date || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Download Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Download Files</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline" onClick={handleDownloadSTL} disabled={!stlUrl}>
                  <Download className="w-4 h-4 mr-2" />
                  Download STL (3D Model)
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={handleDownloadNifti} disabled={!niftiUrl}>
                  <FileText className="w-4 h-4 mr-2" />
                  Download NIfTI (Segmentation)
                </Button>
              </CardContent>
            </Card>

            {/* Navigation Actions */}
            <div className="space-y-3">
              <Button className="w-full" variant="green">
                <Share2 className="w-4 h-4 mr-2" />
                {t.results.share || 'Share Model'}
              </Button>
              <Link to="/dashboard/upload" className="block">
                <Button className="w-full" variant="outline">
                  Upload New Scan
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Printing Recommendations */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Printing Recommendations</CardTitle>
            <CardDescription>Optimal settings for 3D printing this model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Layer Height</h4>
                <p className="text-sm text-muted-foreground">0.2mm for standard quality</p>
                <p className="text-sm text-muted-foreground">0.1mm for high detail</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Infill</h4>
                <p className="text-sm text-muted-foreground">20-30% for lightweight</p>
                <p className="text-sm text-muted-foreground">50-70% for durability</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Support</h4>
                <p className="text-sm text-muted-foreground">Minimal supports required</p>
                <p className="text-sm text-muted-foreground">Use tree supports for complex areas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ResultsPage;
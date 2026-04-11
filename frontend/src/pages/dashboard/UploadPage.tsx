import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Upload, 
  Image, 
  CheckCircle, 
  X, 
  File,
  User,
  Activity,
  Calendar,
  HardDrive,
  Package,
  Hospital,
  Ruler,
  Info,
  Shield,
  Building2,
  Clock,
  Hash,
  Layers,
  Microscope,
  Heart,
  Zap,
  FileArchive,
  Lock,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { useLang } from '../../contexts/LangContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import JSZip from 'jszip';

interface UploadFile {
  id: string;
  name: string;
  size: string;
  sizeBytes: number;
  file: File;
  status: "pending" | "validating" | "uploading" | "ready" | "error";
  progress: number;
  error?: string;
  fileId?: string;
  metadata?: any;
}

export default function UploadPage() {
  const { t } = useLang();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [scanType, setScanType] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [tissueType, setTissueType] = useState('bone'); // NEW: tissue type
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedMetadata, setExtractedMetadata] = useState<any>(null);
  const [anonymize, setAnonymize] = useState(true);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false); // NEW: collapsible metadata
  const navigate = useNavigate();

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatPixelSpacing = (spacing: number[]) => {
    if (!spacing || spacing.length < 2) return 'N/A';
    return `${spacing[0].toFixed(6)} × ${spacing[1].toFixed(6)}`;
  };

  // Step 1: Upload file and extract metadata (no timeout)
  const handleFileUpload = useCallback(async (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter(f => 
      f.name.toLowerCase().endsWith('.dcm') || 
      f.name.toLowerCase().endsWith('.zip')
    );

    if (validFiles.length === 0) {
      alert('Please upload DICOM (.dcm) files or ZIP archives containing DICOM files.');
      return;
    }

    for (const file of validFiles) {
      const newFile: UploadFile = {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: formatFileSize(file.size),
        sizeBytes: file.size,
        file: file,
        status: "pending",
        progress: 0
      };
      
      setFiles(prev => [...prev, newFile]);
      
      try {
        setFiles(prev => prev.map(f => 
          f.id === newFile.id 
            ? { ...f, status: "validating", progress: 20 }
            : f
        ));

        let uploadBlob: Blob;
        let finalFileName: string;

        // Prepare ZIP (backend expects a ZIP)
        if (file.name.toLowerCase().endsWith('.zip')) {
          uploadBlob = file;
          finalFileName = file.name;
        } else {
          const zip = new JSZip();
          const arrayBuffer = await file.arrayBuffer();
          zip.file(file.name, arrayBuffer);
          uploadBlob = await zip.generateAsync({ type: 'blob' });
          finalFileName = file.name.replace('.dcm', '.zip');
        }

        setFiles(prev => prev.map(f => 
          f.id === newFile.id 
            ? { ...f, status: "uploading", progress: 40 }
            : f
        ));

        const formData = new FormData();
        formData.append('file', uploadBlob, finalFileName);
        formData.append('anonymize', anonymize.toString());

        const response = await axios.post(`${apiUrl}/upload-metadata`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setFiles(prev => prev.map(f => 
                f.id === newFile.id ? { ...f, progress: percent } : f
              ));
            }
          }
        });
        
        if (response.data && response.data.file_id) {
          const metadata = response.data.metadata;
          setExtractedMetadata(metadata);
          setSelectedFileId(response.data.file_id);
          
          // Auto-fill patient info from metadata
          if (metadata.patient_name && metadata.patient_name !== 'N/A') setPatientName(metadata.patient_name);
          if (metadata.patient_id && metadata.patient_id !== 'N/A') setPatientId(metadata.patient_id);
          if (metadata.modality && metadata.modality !== 'N/A') setScanType(metadata.modality.toLowerCase());
          
          setFiles(prev => prev.map(f => 
            f.id === newFile.id 
              ? { 
                  ...f, 
                  status: "ready", 
                  progress: 100,
                  fileId: response.data.file_id,
                  metadata: metadata
                }
              : f
          ));
        } else {
          throw new Error('No file_id returned');
        }
      } catch (error: any) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map(f => 
          f.id === newFile.id 
            ? { ...f, status: "error", error: error.response?.data?.error || error.message }
            : f
        ));
      }
    }
  }, [apiUrl, anonymize]);

  // Step 2: Start processing (segmentation + STL) – now includes tissue_type
  const handleStartProcessing = async () => {
    if (!selectedFileId) {
      alert('No file uploaded. Please upload a DICOM ZIP first.');
      return;
    }
    
    if (!projectName || !scanType || !deviceType) {
      alert('Please fill in all required fields.');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('file_id', selectedFileId);
      formData.append('tissue_type', tissueType); // NEW: send tissue type
      formData.append('generate_stl', 'true');
      
      const response = await axios.post(`${apiUrl}/start-processing`, formData);
      
      if (response.data && response.data.job_id) {
        const jobId = response.data.job_id;
        
        const processingInfo = {
          id: jobId,
          projectName,
          patientName,
          patientId,
          scanType,
          deviceType,
          tissueType,
          anonymize,
          metadata: extractedMetadata,
          createdAt: new Date().toISOString()
        };
        sessionStorage.setItem(`processing_${jobId}`, JSON.stringify(processingInfo));
        sessionStorage.setItem('lastProcessingId', jobId);
        
        navigate(`/dashboard/processing/${jobId}`);
      } else {
        throw new Error('No job_id returned');
      }
    } catch (error: any) {
      console.error('Start processing error:', error);
      alert(error.response?.data?.error || 'Failed to start processing');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileUpload(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFileUpload(selectedFiles);
    e.target.value = '';
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (files.length === 1) {
      setExtractedMetadata(null);
      setSelectedFileId(null);
    }
  };

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'ready': return 'text-green-500 bg-green-500/10';
      case 'error': return 'text-red-500 bg-red-500/10';
      case 'uploading': return 'text-purple-500 bg-purple-500/10';
      case 'validating': return 'text-yellow-500 bg-yellow-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getStatusText = (file: UploadFile) => {
    switch (file.status) {
      case 'ready': return 'Ready';
      case 'error': return file.error || 'Error';
      case 'uploading': return `${file.progress}% Uploaded`;
      case 'validating': return 'Validating';
      default: return 'Pending';
    }
  };

  const canStartProcessing = files.some(f => f.status === 'ready') && selectedFileId && projectName && scanType && deviceType && !isProcessing;

  // Full metadata sections (used when expanded)
  const metadataSections = [
    {
      title: "Demographics",
      icon: User,
      data: extractedMetadata,
      items: [
        { label: "Patient Name", key: "patient_name", icon: User },
        { label: "Patient ID", key: "patient_id", icon: Hash },
        { label: "Birth Date", key: "patient_birth_date", icon: Calendar },
        { label: "Sex", key: "patient_sex", icon: Heart },
        { label: "Age", key: "patient_age", icon: Clock }
      ]
    },
    {
      title: "Study Information",
      icon: Calendar,
      data: extractedMetadata,
      items: [
        { label: "Study Date", key: "study_date", icon: Calendar },
        { label: "Study Time", key: "study_time", icon: Clock },
        { label: "Study ID", key: "study_id", icon: Hash },
        { label: "Accession #", key: "accession_number", icon: Hash },
        { label: "Study Description", key: "study_description", icon: Info }
      ]
    },
    {
      title: "Series Information",
      icon: Layers,
      data: extractedMetadata,
      items: [
        { label: "Modality", key: "modality", icon: Activity },
        { label: "Series #", key: "series_number", icon: Hash },
        { label: "Series Description", key: "series_description", icon: Info },
        { label: "Manufacturer", key: "manufacturer", icon: Building2 },
        { label: "Institution", key: "institution_name", icon: Hospital }
      ]
    },
    {
      title: "Image Information",
      icon: Image,
      data: extractedMetadata,
      items: [
        { label: "Total Slices", key: "slice_count", icon: Layers },
        { label: "Slice Thickness", key: "slice_thickness", icon: Ruler, suffix: "mm" },
        { label: "Pixel Spacing", key: "pixel_spacing", icon: Ruler, suffix: "mm",
          formatter: (v: any) => formatPixelSpacing(v) },
        { label: "Image Size", key: "image_size", icon: Ruler, custom: (d: any) => `${d.rows}×${d.columns}` }
      ]
    }
  ];

  // 4 most relevant fields for collapsed view
  const getCollapsedMetadataFields = () => {
    if (!extractedMetadata) return [];
    return [
      { label: "Patient Name", value: extractedMetadata.patient_name || 'N/A', icon: User },
      { label: "Modality", value: extractedMetadata.modality || 'N/A', icon: Activity },
      { label: "Study Date", value: extractedMetadata.study_date || 'N/A', icon: Calendar },
      { label: "Total Slices", value: extractedMetadata.slice_count || 'N/A', icon: Layers }
    ];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Upload CT Scan</h1>
        <p className="text-sm text-muted-foreground">Upload DICOM datasets for AI segmentation and 3D reconstruction</p>
      </div>

      <Card
        className={`cursor-pointer border-2 border-dashed transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onDragOver={(e: any) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-16">
          <motion.div animate={{ y: isDragging ? -8 : 0 }} className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Upload className="h-8 w-8 text-primary" />
          </motion.div>
          <p className="mb-1 text-base font-medium text-foreground">Drag & drop DICOM files or ZIP archives here</p>
          <p className="mb-4 text-sm text-muted-foreground">or click to browse • Max 500 MB</p>
          <input type="file" accept=".dcm,.zip" multiple onChange={handleFileSelect} style={{ display: 'none' }} id="file-upload" />
          <Button variant="outline" size="sm" onClick={() => document.getElementById('file-upload')?.click()}>
            <Image className="mr-2 h-4 w-4" /> Select Files
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="anonymize" checked={anonymize} onChange={(e) => setAnonymize(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary" />
            <Label htmlFor="anonymize" className="text-sm font-medium cursor-pointer">
              <Lock className="inline h-3.5 w-3.5 mr-1" />
              Anonymize DICOM files (remove all patient data) – recommended
            </Label>
            <div className="text-xs text-muted-foreground">
              {anonymize ? "Patient information will be removed on the server." : "Original patient data will be sent to the server."}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: FileArchive, text: "ZIP or DICOM Format", desc: "Upload individual .dcm files or ZIP archives" },
          { icon: CheckCircle, text: "Metadata Extraction", desc: "Auto-detects patient info" },
          { icon: Activity, text: "Anonymisation Available", desc: "Toggle on/off" }
        ].map((item, index) => (
          <div key={index} className="flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-sm">
            <item.icon className="h-4 w-4 shrink-0 text-accent mt-0.5" />
            <div>
              <span className="text-muted-foreground block">{item.text}</span>
              <span className="text-xs text-muted-foreground/70">{item.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {files.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Uploaded Files</CardTitle><CardDescription>Files ready for processing</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-4 rounded-lg border border-border p-3">
                <File className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{file.size}</p>
                  {file.status !== "pending" && file.status !== "ready" && file.status !== "error" && (
                    <Progress value={file.progress} className="mt-1.5 h-1" />
                  )}
                  {file.error && <p className="mt-1 text-xs text-red-500">{file.error}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(file.status)}`}>
                  {getStatusText(file)}
                </span>
                {file.status !== "uploading" && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(file.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {extractedMetadata && (
        <Card className="border-primary/20 shadow-lg">
          <CardHeader 
            className="bg-gradient-to-r from-primary/5 to-transparent pb-2 cursor-pointer hover:bg-primary/5 transition-colors"
            onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">DICOM Metadata Extracted</CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isMetadataExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            <CardDescription>Information automatically detected from your DICOM files</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {isMetadataExpanded ? (
              <div className="space-y-6">
                {metadataSections.map((section, idx) => {
                  const Icon = section.icon;
                  const hasData = section.data && Object.keys(section.data).some(key => section.data[key] && section.data[key] !== 'N/A');
                  if (!hasData) return null;
                  return (
                    <div key={idx} className="border-b border-border last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center gap-2 mb-3"><Icon className="h-4 w-4 text-primary" /><h3 className="font-semibold text-sm">{section.title}</h3></div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {section.items.map((item) => {
                          let value = section.data[item.key];
                          if (item.custom) value = item.custom(section.data);
                          if (item.formatter && value) value = item.formatter(value);
                          if (!value || value === 'N/A') return null;
                          const ItemIcon = item.icon;
                          return (
                            <div key={item.label} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                              <ItemIcon className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                              <div><p className="text-xs text-muted-foreground">{item.label}</p><p className="text-sm font-medium">{value}{item.suffix ? ` ${item.suffix}` : ''}</p></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {getCollapsedMetadataFields().map((field, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                    <field.icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">{field.label}</p>
                      <p className="text-sm font-medium">{field.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Model Job Information</CardTitle><CardDescription>Enter patient and model details for record keeping</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="projectName">Project Name *</Label><Input id="projectName" placeholder="e.g., Wrist Splint - Patient A" value={projectName} onChange={(e) => setProjectName(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="patientName">Patient Name</Label><Input id="patientName" placeholder="Auto-detected from DICOM" value={patientName} onChange={(e) => setPatientName(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="patientId">Patient ID</Label><Input id="patientId" placeholder="Auto-detected from DICOM" value={patientId} onChange={(e) => setPatientId(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="scanType">Scan Type *</Label><Select value={scanType} onValueChange={setScanType}><SelectTrigger><SelectValue placeholder="Select scan type" /></SelectTrigger><SelectContent><SelectItem value="ct">CT Scan</SelectItem><SelectItem value="cbct" className="hidden">CBCT Scan</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="deviceType">Device Type *</Label><Select value={deviceType} onValueChange={setDeviceType}><SelectTrigger><SelectValue placeholder="Select device type" /></SelectTrigger><SelectContent><SelectItem value="splint">Hand Splint</SelectItem><SelectItem value="wrist_brace">Wrist Brace</SelectItem><SelectItem value="custom_orthotic">Custom Orthotic</SelectItem><SelectItem value="prosthetic">Prosthetic Socket</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="tissueType">Tissue Type *</Label><Select value={tissueType} onValueChange={setTissueType}><SelectTrigger><SelectValue placeholder="Select tissue to segment" /></SelectTrigger><SelectContent><SelectItem value="bone">Bone Only</SelectItem><SelectItem value="soft_tissue">Soft Tissue Only</SelectItem><SelectItem value="all">All Tissues (Bone + Soft)</SelectItem></SelectContent></Select></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button size="lg" className="flex-1" onClick={handleStartProcessing} disabled={!canStartProcessing || isProcessing}>
          {isProcessing ? 'Starting...' : 'Start Processing'}
        </Button>
        <Button size="lg" variant="outline" onClick={() => { setFiles([]); setProjectName(''); setPatientName(''); setPatientId(''); setScanType(''); setDeviceType(''); setTissueType('bone'); setExtractedMetadata(null); setSelectedFileId(null); }}>
          Clear All
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">Supported formats: Individual DICOM (.dcm) files or ZIP archives containing DICOM files. Maximum file size: 500MB.</p>
    </div>
  );
}
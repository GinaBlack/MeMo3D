import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Progress } from '../../../components/ui/progress';
import { CheckCircle2, Loader2, AlertCircle, FileText, Clock } from 'lucide-react';
import axios from 'axios';

const STEPS = [
  { id: 1, label: 'Validating DICOM files' },
  { id: 2, label: 'Extracting and sorting slices' },
  { id: 3, label: 'AI Segmentation (MONAI U-Net)' },
  { id: 4, label: '3D Mesh Generation' },
  { id: 5, label: 'Exporting STL file' },
];

export function ProcessingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  useEffect(() => {
    if (!id) return;

    const pollStatus = async () => {
      try {
        const res = await axios.get(`${apiUrl}/status/${id}`);
        const data = res.data;
        if (data.state === 'completed') {
          setProgress(100);
          setStatus('completed');
          if (pollingRef.current) clearInterval(pollingRef.current);
          // Store final result
          const resultRes = await axios.get(`${apiUrl}/result/${id}`);
          const resultData = resultRes.data;
          const stored = sessionStorage.getItem(`processing_${id}`);
          const baseInfo = stored ? JSON.parse(stored) : {};
          const fullInfo = { ...baseInfo, result: resultData, stlFile: resultData.stl_file, niftiFile: resultData.nifti_file };
          sessionStorage.setItem(`processing_${id}`, JSON.stringify(fullInfo));
          setTimeout(() => navigate(`/dashboard/results/${id}`), 1500);
        } else if (data.state === 'failed') {
          setError(data.error || 'Processing failed');
          setStatus('failed');
          if (pollingRef.current) clearInterval(pollingRef.current);
        } else if (data.state === 'processing') {
          const prog = data.progress || 0;
          setProgress(prog);
          // Update step based on progress
          let step = 0;
          if (prog >= 90) step = 4;
          else if (prog >= 70) step = 3;
          else if (prog >= 40) step = 2;
          else if (prog >= 20) step = 1;
          setCurrentStep(step);
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    };

    pollStatus();
    pollingRef.current = setInterval(pollStatus, 2000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [id, apiUrl, navigate]);

  if (status === 'failed') {
    return (
      <div className="container mx-auto py-12 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">Processing Failed</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => navigate('/dashboard/upload')}>Try Again</Button>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="container mx-auto py-12 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Processing Complete!</h2>
        <p className="text-muted-foreground mb-4">Your 3D model has been generated.</p>
        <p className="text-sm text-muted-foreground">Redirecting to results page...</p>
        <Progress value={100} className="h-1 mt-4 max-w-md mx-auto" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Processing CT Scan</h1>
        <p className="text-muted-foreground">Please wait while we generate your 3D model</p>
      </div>

      <Card className="mb-8">
        <CardHeader><CardTitle>Overall Progress: {Math.round(progress)}%</CardTitle></CardHeader>
        <CardContent><Progress value={progress} className="h-3" /></CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {STEPS.map((step, idx) => {
            const isComplete = idx < currentStep || status === 'completed';
            const isCurrent = idx === currentStep && status !== 'completed';
            return (
              <div key={step.id} className="flex items-center gap-4">
                {isComplete ? <CheckCircle2 className="text-green-500 w-5 h-5" /> : isCurrent ? <Loader2 className="animate-spin text-primary w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-muted" />}
                <div className="flex-1">
                  <p className={`font-medium ${isCurrent ? 'text-primary' : ''}`}>{step.label}</p>
                  {isCurrent && step.id === 3 && <p className="text-xs text-muted-foreground mt-1">AI model analyzing CT slices (may take several minutes)</p>}
                  {isCurrent && step.id === 4 && <p className="text-xs text-muted-foreground mt-1">Converting segmentation to printable 3D model</p>}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
        <span className="text-sm">Processing may take several minutes. Please do not close this window.</span>
      </div>
    </div>
  );
}

export default ProcessingPage;
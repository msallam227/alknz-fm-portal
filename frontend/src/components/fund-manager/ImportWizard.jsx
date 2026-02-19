import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  Table,
  Columns,
  Loader2,
  FileUp,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

// Investor profile fields that can be mapped
const MAPPABLE_FIELDS = [
  { key: 'investor_name', label: 'Investor Name', required: true },
  { key: 'title', label: 'Title' },
  { key: 'gender', label: 'Gender' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'age', label: 'Age' },
  { key: 'job_title', label: 'Job Title / Firm' },
  { key: 'investor_type', label: 'Investor Type' },
  { key: 'sector', label: 'Sector' },
  { key: 'country', label: 'Country' },
  { key: 'city', label: 'City' },
  { key: 'website', label: 'Website' },
  { key: 'description', label: 'Description' },
  { key: 'wealth', label: 'Wealth' },
  { key: 'expected_ticket_amount', label: 'Expected Ticket Amount' },
  { key: 'expected_ticket_currency', label: 'Expected Ticket Currency' },
  { key: 'contact_name', label: 'Contact Name' },
  { key: 'contact_title', label: 'Contact Title' },
  { key: 'contact_phone', label: 'Phone Number' },
  { key: 'contact_email', label: 'Email' },
  { key: 'contact_whatsapp', label: 'WhatsApp' },
  { key: 'relationship_strength', label: 'Relationship Strength' },
  { key: 'decision_role', label: 'Decision Role' },
  { key: 'preferred_intro_path', label: 'Preferred Intro Path' },
];

// Parse CSV string to array of objects
const parseCSV = (csvText) => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [], error: 'Empty file' };
  
  // Parse header line
  const headers = parseCSVLine(lines[0]);
  if (headers.length === 0) return { headers: [], rows: [], error: 'No headers found' };
  
  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length > 0) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }
  }
  
  return { headers, rows, error: null };
};

// Parse a single CSV line (handles quoted values with commas)
const parseCSVLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
};

// Step components
const StepIndicator = ({ currentStep, steps }) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {steps.map((step, idx) => (
      <React.Fragment key={step.id}>
        <div className={`flex items-center gap-2 ${idx <= currentStep ? 'text-[#00A3FF]' : 'text-[#94A3B8]'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            idx < currentStep 
              ? 'bg-[#22C55E] text-white' 
              : idx === currentStep 
                ? 'bg-[#0047AB] text-white' 
                : 'bg-[#1A2744] text-[#94A3B8]'
          }`}>
            {idx < currentStep ? <Check className="h-4 w-4" /> : idx + 1}
          </div>
          <span className={`text-sm font-medium hidden sm:inline ${idx === currentStep ? 'text-white' : ''}`}>
            {step.label}
          </span>
        </div>
        {idx < steps.length - 1 && (
          <div className={`w-8 h-0.5 ${idx < currentStep ? 'bg-[#22C55E]' : 'bg-[#1A2744]'}`} />
        )}
      </React.Fragment>
    ))}
  </div>
);

// Step 1: Upload File
const UploadStep = ({ onFileSelect, parsedData, onClear }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file) => {
    // Validate file type
    const validTypes = ['text/csv', 'application/vnd.ms-excel'];
    const isCSV = validTypes.includes(file.type) || file.name.toLowerCase().endsWith('.csv');
    
    if (!isCSV) {
      toast.error('Please upload a CSV file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const result = parseCSV(text);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }
      
      if (result.rows.length === 0) {
        toast.error('No data rows found in file');
        return;
      }
      
      onFileSelect({
        fileName: file.name,
        fileSize: file.size,
        headers: result.headers,
        rows: result.rows,
        totalRows: result.rows.length
      });
      
      toast.success(`Parsed ${result.rows.length} rows from ${file.name}`);
      
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Failed to parse file');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {!parsedData ? (
        /* Upload Zone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging 
              ? 'border-[#00A3FF] bg-[#0047AB]/20' 
              : 'border-[#1A2744] hover:border-[#0047AB]/50 hover:bg-[#0047AB]/10'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            data-testid="csv-file-input"
          />
          
          {isProcessing ? (
            <div className="space-y-3">
              <Loader2 className="h-12 w-12 text-[#00A3FF] mx-auto animate-spin" />
              <p className="text-white">Processing file...</p>
            </div>
          ) : (
            <>
              <FileUp className="h-12 w-12 text-[#94A3B8] mx-auto mb-4" />
              <p className="text-white font-medium mb-2">
                Drop your CSV file here or click to browse
              </p>
              <p className="text-[#94A3B8] text-sm">
                Supports .csv files up to 5MB
              </p>
            </>
          )}
        </div>
      ) : (
        /* File Preview */
        <div className="space-y-4">
          {/* File Info */}
          <div className="flex items-center justify-between p-4 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-lg">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-[#22C55E]" />
              <div>
                <p className="text-white font-medium">{parsedData.fileName}</p>
                <p className="text-sm text-[#94A3B8]">
                  {parsedData.totalRows} rows • {parsedData.headers.length} columns • 
                  {(parsedData.fileSize / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-[#EF4444] hover:text-white hover:bg-[#EF4444]/20"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
          
          {/* Detected Columns */}
          <div>
            <Label className="text-[#94A3B8] text-sm mb-2 block">Detected Columns:</Label>
            <div className="flex flex-wrap gap-2">
              {parsedData.headers.map((header, idx) => (
                <Badge 
                  key={idx} 
                  className="bg-[#1A2744] text-[#94A3B8] border-0"
                >
                  {header}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Data Preview */}
          <div>
            <Label className="text-[#94A3B8] text-sm mb-2 block">
              Preview (first {Math.min(10, parsedData.rows.length)} rows):
            </Label>
            <div className="border border-[#1A2744] rounded-lg overflow-x-auto max-h-[300px] overflow-y-auto">
              <UITable>
                <TableHeader className="sticky top-0 bg-[#0A1628]">
                  <TableRow className="border-[#1A2744]">
                    <TableHead className="text-[#94A3B8] w-12">#</TableHead>
                    {parsedData.headers.map((header, idx) => (
                      <TableHead key={idx} className="text-[#94A3B8] whitespace-nowrap">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.rows.slice(0, 10).map((row, rowIdx) => (
                    <TableRow key={rowIdx} className="border-[#1A2744]">
                      <TableCell className="text-[#475569]">{rowIdx + 1}</TableCell>
                      {parsedData.headers.map((header, colIdx) => (
                        <TableCell key={colIdx} className="text-white max-w-[200px] truncate">
                          {row[header] || <span className="text-[#475569]">-</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </UITable>
            </div>
            {parsedData.rows.length > 10 && (
              <p className="text-xs text-[#475569] mt-2">
                + {parsedData.rows.length - 10} more rows
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Step 2: Map Fields
const MapFieldsStep = ({ parsedData, fieldMappings, onMappingChange }) => {
  const getUnmappedHeaders = (currentField) => {
    const mappedHeaders = Object.values(fieldMappings).filter(h => h && h !== fieldMappings[currentField]);
    return parsedData.headers.filter(h => !mappedHeaders.includes(h));
  };

  const getSampleValues = (header) => {
    if (!header) return [];
    return parsedData.rows
      .slice(0, 3)
      .map(row => row[header])
      .filter(v => v);
  };

  return (
    <div className="space-y-6">
      <div className="p-3 bg-[#0047AB]/10 border border-[#0047AB]/30 rounded-lg">
        <p className="text-sm text-[#00A3FF]">
          Map your CSV columns to investor profile fields. Fields marked with * are required.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
        {MAPPABLE_FIELDS.map(field => {
          const currentMapping = fieldMappings[field.key];
          const sampleValues = getSampleValues(currentMapping);
          
          return (
            <div 
              key={field.key} 
              className="p-3 border border-[#1A2744] rounded-lg bg-[#02040A]/40"
            >
              <div className="flex items-center justify-between mb-2">
                <Label className="text-white text-sm">
                  {field.label}
                  {field.required && <span className="text-[#EF4444] ml-1">*</span>}
                </Label>
                {currentMapping && (
                  <Badge className="bg-[#22C55E]/20 text-[#22C55E] border-0 text-xs">
                    Mapped
                  </Badge>
                )}
              </div>
              
              <Select
                value={currentMapping || 'none'}
                onValueChange={(value) => onMappingChange(field.key, value === 'none' ? null : value)}
              >
                <SelectTrigger 
                  className="bg-[#02040A]/60 border-[#1A2744] text-white"
                  data-testid={`map-field-${field.key}`}
                >
                  <SelectValue placeholder="Select CSV column" />
                </SelectTrigger>
                <SelectContent className="bg-[#0A1628] border-[#1A2744] max-h-[200px]">
                  <SelectItem value="none" className="text-[#94A3B8]">
                    -- Don't import --
                  </SelectItem>
                  {getUnmappedHeaders(field.key).map(header => (
                    <SelectItem key={header} value={header} className="text-white">
                      {header}
                    </SelectItem>
                  ))}
                  {currentMapping && !getUnmappedHeaders(field.key).includes(currentMapping) && (
                    <SelectItem value={currentMapping} className="text-white">
                      {currentMapping}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              
              {sampleValues.length > 0 && (
                <p className="text-xs text-[#475569] mt-1 truncate">
                  Sample: {sampleValues.join(', ')}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Mapping Summary */}
      <div className="flex items-center justify-between p-3 bg-[#1A2744]/50 rounded-lg">
        <span className="text-[#94A3B8] text-sm">
          {Object.values(fieldMappings).filter(Boolean).length} of {parsedData.headers.length} columns mapped
        </span>
        {!fieldMappings.investor_name && (
          <span className="text-[#EF4444] text-sm flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Investor Name is required
          </span>
        )}
      </div>
    </div>
  );
};

// Step 3: Review & Import
const ReviewStep = ({ parsedData, fieldMappings, importing, onImport }) => {
  // Transform rows based on mappings
  const transformedRows = parsedData.rows.map(row => {
    const transformed = {};
    Object.entries(fieldMappings).forEach(([field, csvColumn]) => {
      if (csvColumn && row[csvColumn]) {
        transformed[field] = row[csvColumn];
      }
    });
    return transformed;
  });

  // Filter out rows without investor_name
  const validRows = transformedRows.filter(row => row.investor_name?.trim());
  const invalidRows = transformedRows.length - validRows.length;

  const mappedFields = MAPPABLE_FIELDS.filter(f => fieldMappings[f.key]);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-lg text-center">
          <p className="text-2xl font-bold text-[#22C55E]">{validRows.length}</p>
          <p className="text-sm text-[#94A3B8]">Valid Rows</p>
        </div>
        <div className="p-4 bg-[#1A2744] rounded-lg text-center">
          <p className="text-2xl font-bold text-white">{mappedFields.length}</p>
          <p className="text-sm text-[#94A3B8]">Mapped Fields</p>
        </div>
        {invalidRows > 0 && (
          <div className="p-4 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg text-center">
            <p className="text-2xl font-bold text-[#F59E0B]">{invalidRows}</p>
            <p className="text-sm text-[#94A3B8]">Skipped (No Name)</p>
          </div>
        )}
      </div>

      {/* Field Mapping Summary */}
      <div>
        <Label className="text-[#94A3B8] text-sm mb-2 block">Field Mappings:</Label>
        <div className="flex flex-wrap gap-2">
          {mappedFields.map(field => (
            <Badge key={field.key} className="bg-[#0047AB]/20 text-[#00A3FF] border-0">
              {field.label} ← {fieldMappings[field.key]}
            </Badge>
          ))}
        </div>
      </div>

      {/* Preview of Transformed Data */}
      <div>
        <Label className="text-[#94A3B8] text-sm mb-2 block">
          Preview (first 5 rows to be imported):
        </Label>
        <div className="border border-[#1A2744] rounded-lg overflow-x-auto max-h-[250px] overflow-y-auto">
          <UITable>
            <TableHeader className="sticky top-0 bg-[#0A1628]">
              <TableRow className="border-[#1A2744]">
                <TableHead className="text-[#94A3B8] w-12">#</TableHead>
                {mappedFields.map(field => (
                  <TableHead key={field.key} className="text-[#94A3B8] whitespace-nowrap">
                    {field.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {validRows.slice(0, 5).map((row, idx) => (
                <TableRow key={idx} className="border-[#1A2744]">
                  <TableCell className="text-[#475569]">{idx + 1}</TableCell>
                  {mappedFields.map(field => (
                    <TableCell key={field.key} className="text-white max-w-[150px] truncate">
                      {row[field.key] || <span className="text-[#475569]">-</span>}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </UITable>
        </div>
      </div>

      {/* Import Warning */}
      <div className="p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg">
        <p className="text-sm text-[#F59E0B]">
          <strong>Note:</strong> This will create {validRows.length} new investor profiles in your fund. 
          Duplicate names within the same fund will be rejected.
        </p>
      </div>
    </div>
  );
};

// Main Import Wizard Component
const ImportWizard = ({
  open,
  onClose,
  selectedFund,
  token,
  API_URL,
  onImportSuccess
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [parsedData, setParsedData] = useState(null);
  const [fieldMappings, setFieldMappings] = useState({});
  const [importing, setImporting] = useState(false);

  const steps = [
    { id: 'upload', label: 'Upload File', icon: Upload },
    { id: 'map', label: 'Map Fields', icon: Columns },
    { id: 'review', label: 'Review & Import', icon: Check },
  ];

  const handleFileSelect = (data) => {
    setParsedData(data);
    
    // Auto-map fields based on header names
    const autoMappings = {};
    MAPPABLE_FIELDS.forEach(field => {
      const matchingHeader = data.headers.find(h => 
        h.toLowerCase().replace(/[_\s-]/g, '') === field.key.toLowerCase().replace(/[_\s-]/g, '') ||
        h.toLowerCase().includes(field.label.toLowerCase().split(' ')[0].toLowerCase())
      );
      if (matchingHeader) {
        autoMappings[field.key] = matchingHeader;
      }
    });
    setFieldMappings(autoMappings);
  };

  const handleClearFile = () => {
    setParsedData(null);
    setFieldMappings({});
    setCurrentStep(0);
  };

  const handleMappingChange = (field, csvColumn) => {
    setFieldMappings(prev => ({
      ...prev,
      [field]: csvColumn
    }));
  };

  const handleImport = async () => {
    if (!parsedData || !selectedFund) return;
    
    setImporting(true);
    
    try {
      // Transform rows based on mappings
      const investorsToCreate = parsedData.rows
        .map(row => {
          const investor = { source: 'spreadsheet_import' };
          Object.entries(fieldMappings).forEach(([field, csvColumn]) => {
            if (csvColumn && row[csvColumn]) {
              investor[field] = row[csvColumn];
            }
          });
          return investor;
        })
        .filter(inv => inv.investor_name?.trim());
      
      // Import investors in batches to prevent overwhelming the browser/server
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      const BATCH_SIZE = 5; // Process 5 at a time
      
      for (let i = 0; i < investorsToCreate.length; i += BATCH_SIZE) {
        const batch = investorsToCreate.slice(i, i + BATCH_SIZE);
        
        // Process batch in parallel
        const results = await Promise.allSettled(
          batch.map(async (investor) => {
            const res = await fetch(`${API_URL}/api/investor-profiles`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                ...investor,
                fund_id: selectedFund.id,
                office_id: selectedFund.office_id || null
              })
            });
            
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.detail || 'Failed to create');
            }
            return investor.investor_name;
          })
        );
        
        // Count results
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            successCount++;
          } else {
            errorCount++;
            errors.push(`${batch[idx].investor_name}: ${result.reason?.message || 'Unknown error'}`);
          }
        });
        
        // Small delay between batches to prevent overwhelming
        if (i + BATCH_SIZE < investorsToCreate.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} investors`);
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} investors could not be imported (duplicates or errors)`);
        console.log('Import errors:', errors);
      }
      
      onImportSuccess && onImportSuccess(successCount);
      handleClose();
      
    } catch (error) {
      toast.error('Import failed');
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setParsedData(null);
    setFieldMappings({});
    setCurrentStep(0);
    onClose();
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return parsedData !== null;
      case 1:
        return fieldMappings.investor_name !== undefined && fieldMappings.investor_name !== null;
      case 2:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="bg-[#0A1628] border-[#1A2744] text-white max-w-4xl max-h-[90vh] overflow-y-auto"
        aria-describedby="import-wizard-description"
      >
        <DialogHeader>
          <DialogTitle className="font-bold flex items-center gap-2 text-xl">
            <FileSpreadsheet className="h-5 w-5 text-[#00A3FF]" />
            Import Investors from CSV
          </DialogTitle>
          <p id="import-wizard-description" className="sr-only">
            Upload a CSV file to import investors into your fund
          </p>
        </DialogHeader>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} steps={steps} />

        {/* Step Content */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <UploadStep
                  onFileSelect={handleFileSelect}
                  parsedData={parsedData}
                  onClear={handleClearFile}
                />
              </motion.div>
            )}
            
            {currentStep === 1 && parsedData && (
              <motion.div
                key="map"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <MapFieldsStep
                  parsedData={parsedData}
                  fieldMappings={fieldMappings}
                  onMappingChange={handleMappingChange}
                />
              </motion.div>
            )}
            
            {currentStep === 2 && parsedData && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ReviewStep
                  parsedData={parsedData}
                  fieldMappings={fieldMappings}
                  importing={importing}
                  onImport={handleImport}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[#1A2744]">
          <Button
            variant="outline"
            onClick={currentStep === 0 ? handleClose : () => setCurrentStep(s => s - 1)}
            className="bg-transparent border-[#1A2744] text-white hover:bg-[#0047AB]/20"
          >
            {currentStep === 0 ? (
              'Cancel'
            ) : (
              <>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </>
            )}
          </Button>
          
          {currentStep < 2 ? (
            <Button
              onClick={() => setCurrentStep(s => s + 1)}
              disabled={!canProceed()}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0052CC 100%)' }}
              data-testid="import-next-step"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={importing || !canProceed()}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }}
              data-testid="import-confirm"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Import {parsedData?.rows.filter(r => {
                    const nameCol = fieldMappings.investor_name;
                    return nameCol && r[nameCol]?.trim();
                  }).length || 0} Investors
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportWizard;


'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Tag, Play, StopCircle, Download, RefreshCw } from "lucide-react";
import type { AppCategoryCheck } from "@/types";
import { formatTimestamp } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { validateAppCategory, type ValidateAppCategoryInput } from "@/ai/flows/validate-app-category";
import { PageHeader } from "@/components/shared/page-header";
import { TruncatedTextCell } from '@/components/shared/truncated-text-cell';

interface AppValidationDashboardProps {
  initialValidationRecords: AppCategoryCheck[];
}

interface FailedRowData {
  appName: string;
  description: string;
  category: string;
  errorReason: string;
}

const REQUEST_DELAY_MS = 2000; // Delay between AI requests

export function AppValidationDashboard({ initialValidationRecords }: AppValidationDashboardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoadingCsv, setIsLoadingCsv] = useState(false);
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);
  const [validationRecords, setValidationRecords] = useState<AppCategoryCheck[]>(initialValidationRecords);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  const [processingStatus, setProcessingStatus] = useState<string>('');
  const wasCancelledRef = useRef<boolean>(false);
  const [retryableFailedRows, setRetryableFailedRows] = useState<FailedRowData[]>([]);


  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setValidationRecords(initialValidationRecords);
  }, [initialValidationRecords]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setRetryableFailedRows([]); 
      wasCancelledRef.current = false; 
    } else {
      setFile(null);
    }
  };

  const escapeCsvField = (field: string | number | boolean | undefined): string => {
    if (field === undefined || field === null) return '';
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n') || stringField.includes('\r')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  const downloadCsvFile = (filename: string, csvString: string) => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      toast({ title: "Download Failed", description: "Your browser does not support direct CSV downloads.", variant: "destructive" });
    }
  };

  const processValidation = async (
    rowsToProcess: { appName: string; description: string; category: string; originalIndex?: number }[],
    isRetry: boolean
  ): Promise<{ successfulRecords: AppCategoryCheck[], newFailedRows: FailedRowData[] }> => {
    const currentBatchSuccessful: AppCategoryCheck[] = [];
    const currentBatchFailed: FailedRowData[] = [];
    
    for (let i = 0; i < rowsToProcess.length; i++) {
      if (wasCancelledRef.current) {
        toast({ title: isRetry ? "Retry Stopped" : "Validation Stopped", description: "Process was cancelled by the user.", variant: "default" });
        setProcessingStatus('');
        break;
      }

      const { appName, description, category } = rowsToProcess[i];
      setProcessingStatus(`${isRetry ? 'Retrying' : 'Processing'} app ${i + 1} of ${rowsToProcess.length}: ${appName}`);
      
      const input: ValidateAppCategoryInput = { app: appName, description, category };
      
      try {
        const result = await validateAppCategory(input);
        const newRecord: AppCategoryCheck = {
          id: `csv-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
          app: appName,
          description,
          originalCategory: category,
          isValidCategory: result.isValidCategory,
          validationReason: result.validationReason,
          checkedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
        };
        
        currentBatchSuccessful.push(newRecord);
        setValidationRecords(prevRecords =>
          [newRecord, ...prevRecords].sort((a, b) => {
            const aTime = typeof a.checkedAt === 'string' ? new Date(a.checkedAt).getTime() / 1000 : a.checkedAt.seconds;
            const bTime = typeof b.checkedAt === 'string' ? new Date(b.checkedAt).getTime() / 1000 : b.checkedAt.seconds;
            return bTime - aTime;
          })
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown AI validation error.";
        console.error(`Error validating app ${appName}:`, err);
        toast({ title: `Error validating ${appName}`, description: `This app entry could not be validated. ${errorMessage}`, variant: "destructive", duration: 7000});
        const failedData = { appName, description, category, errorReason: errorMessage };
        currentBatchFailed.push(failedData);
      }

      if (i < rowsToProcess.length - 1 && !wasCancelledRef.current) {
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS));
      }
    }
    return { successfulRecords: currentBatchSuccessful, newFailedRows: currentBatchFailed };
  };


  const handleValidateCsv = async () => {
    if (!file) {
      toast({ title: "No file selected", description: "Please select a CSV file to validate.", variant: "destructive" });
      return;
    }
    setIsLoadingCsv(true);
    wasCancelledRef.current = false;
    setRetryableFailedRows([]); 
    toast({ title: "Processing CSV...", description: "Displaying results live. Please wait, this may take a while for larger files.", variant: "default", duration: 10000});

    const rowsForValidation: { appName: string; description: string; category: string; }[] = [];
    const initialParsingFailedRows: FailedRowData[] = []; 

    try {
      const fileContent = await file.text();
      const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');

      if (lines.length < 2) {
        toast({ title: "Invalid CSV", description: "CSV must have a header row and at least one data row.", variant: "destructive" });
        setIsLoadingCsv(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const appNameIndex = headers.indexOf('appname');
      const descriptionIndex = headers.indexOf('description');
      const categoryIndex = headers.indexOf('category');

      if (appNameIndex === -1 || descriptionIndex === -1 || categoryIndex === -1) {
        toast({ title: "Invalid CSV Headers", description: "CSV must contain 'appName', 'description', and 'category' columns (case-insensitive).", variant: "destructive" });
        setIsLoadingCsv(false);
        return;
      }

      const dataRows = lines.slice(1);
      for (let i = 0; i < dataRows.length; i++) {
        const rowString = dataRows[i];
        const rowValues = [];
        let currentField = '';
        let inQuotes = false;
        for (let charIndex = 0; charIndex < rowString.length; charIndex++) {
            const char = rowString[charIndex];
            if (char === '"') {
                if (inQuotes && charIndex + 1 < rowString.length && rowString[charIndex + 1] === '"') {
                    currentField += '"'; 
                    charIndex++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                rowValues.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }
        rowValues.push(currentField.trim());


        const appName = rowValues[appNameIndex];
        const description = rowValues[descriptionIndex];
        const category = rowValues[categoryIndex];

        if (!appName || !description || !category) {
          console.warn(`Skipping row ${i + 2} due to missing data. Row content: ${rowString}`);
          initialParsingFailedRows.push({ appName: appName || 'N/A', description: description || 'N/A', category: category || 'N/A', errorReason: 'Missing data in row' });
          continue;
        }
        rowsForValidation.push({ appName, description, category });
      }

      const { newFailedRows: aiValidationFailedRows } = await processValidation(rowsForValidation, false);
      setRetryableFailedRows(aiValidationFailedRows); 

      const allFailedForDownload = [...initialParsingFailedRows, ...aiValidationFailedRows];

      if (!wasCancelledRef.current) {
         toast({ title: "CSV Validation Complete", description: `${rowsForValidation.length - aiValidationFailedRows.length} of ${rowsForValidation.length} processable records validated. ${initialParsingFailedRows.length} records failed parsing.` });
        if (aiValidationFailedRows.length > 0) {
          toast({ title: "Retry Available", description: `${aiValidationFailedRows.length} app(s) failed AI validation and can be retried.`, variant: "default", duration: 10000 });
        }
      }
      
      if (allFailedForDownload.length > 0) {
        const failedHeaders = ["App Name", "Description", "Category", "Error Reason"];
        const failedCsvRows = [
          failedHeaders.join(','),
          ...allFailedForDownload.map(row => [
            escapeCsvField(row.appName),
            escapeCsvField(row.description),
            escapeCsvField(row.category),
            escapeCsvField(row.errorReason)
          ].join(','))
        ];
        const failedCsvString = failedCsvRows.join('\r\n');
        downloadCsvFile('failed_app_validations.csv', failedCsvString);
        toast({
          title: "Failed Rows Exported",
          description: `${allFailedForDownload.length} app(s) encountered issues and have been saved to 'failed_app_validations.csv'.`,
          variant: "default",
          duration: 10000,
          action: (
            <ToastAction altText="Download failed rows again" asChild>
              <Button variant="ghost" size="sm" onClick={() => downloadCsvFile('failed_app_validations.csv', failedCsvString)}>
                <Download className="mr-2 h-4 w-4" /> <span>Download Again</span>
              </Button>
            </ToastAction>
          )
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown CSV processing error.";
      console.error("Error validating CSV:", error);
      toast({ title: "Error Processing CSV", description: `Could not process the CSV file. ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsLoadingCsv(false);
      if (!wasCancelledRef.current) setProcessingStatus('');
    }
  };

  const handleRetryFailedValidations = async () => {
    if (retryableFailedRows.length === 0) {
      toast({ title: "No Rows to Retry", description: "There are no failed validations to retry.", variant: "default" });
      return;
    }
    setIsRetryingFailed(true);
    wasCancelledRef.current = false;
    toast({ title: "Retrying Failed Validations...", description: `Attempting to validate ${retryableFailedRows.length} app(s).`, variant: "default", duration: 10000 });

    const rowsToRetry = [...retryableFailedRows]; 
    setRetryableFailedRows([]); 

    const { newFailedRows } = await processValidation(rowsToRetry, true);
    setRetryableFailedRows(newFailedRows);

    if (!wasCancelledRef.current) {
      toast({ title: "Retry Process Complete", description: `${rowsToRetry.length - newFailedRows.length} of ${rowsToRetry.length} previously failed records validated successfully.` });
      if (newFailedRows.length > 0) {
         toast({ title: "Some Retries Failed", description: `${newFailedRows.length} app(s) failed validation again. Check 'failed_app_validations.csv' if downloaded, or retry again.`, variant: "destructive", duration: 10000 });
      }
    }
    
    setIsRetryingFailed(false);
    if (!wasCancelledRef.current) setProcessingStatus('');
  };

  const handleStopProcessing = () => {
    wasCancelledRef.current = true;
  };

  const handleDownloadCsv = () => {
    if (validationRecords.length === 0) {
      toast({ title: "No data to download", description: "There are no validation records to export.", variant: "default" });
      return;
    }

    const headers = ["App Name", "Description", "Original Category", "Is Valid Category", "Validation Reason", "Checked At"];
    const csvRows = [
      headers.join(','),
      ...validationRecords.map(record => [
        escapeCsvField(record.app),
        escapeCsvField(record.description),
        escapeCsvField(record.originalCategory),
        escapeCsvField(record.isValidCategory),
        escapeCsvField(record.validationReason),
        escapeCsvField(isMounted ? formatTimestamp(record.checkedAt) : 'N/A')
      ].join(','))
    ];
    
    const csvString = csvRows.join('\r\n');
    downloadCsvFile('validation_results.csv', csvString);
    toast({ title: "Download Started", description: "Your CSV file 'validation_results.csv' is being downloaded." });
  };

  return (
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/><path d="M12 22V12"/></svg>
            <h1 className="text-xl font-semibold">ValidateWise</h1>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 container mx-auto">
          <PageHeader
            title="Validation Dashboard"
            description="Overview of app category validations. Upload a CSV to batch validate or download current results."
          />

          <Card className="mb-8 shadow-lg rounded-lg transition-all duration-200 ease-in-out hover:shadow-xl">
            <CardHeader>
              <CardTitle>Manage Validations</CardTitle>
              <CardDescription>
                Upload a CSV file (appName, description, category) or download existing results.
                {processingStatus && <span className="block mt-2 text-sm text-primary">{processingStatus}</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 items-center flex-grow w-full sm:w-auto">
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="flex-grow"
                    aria-label="Upload CSV file"
                    disabled={isLoadingCsv || isRetryingFailed}
                  />
                  {isLoadingCsv || isRetryingFailed ? (
                    <Button 
                      onClick={handleStopProcessing}
                      variant="destructive"
                      className="w-full sm:w-auto transition-transform duration-150 ease-in-out hover:scale-105"
                    >
                      <StopCircle className="mr-2 h-4 w-4" />
                      Stop {isLoadingCsv ? 'Validation' : 'Retrying'}
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleValidateCsv} 
                      disabled={!file || isLoadingCsv || isRetryingFailed} 
                      className="w-full sm:w-auto transition-transform duration-150 ease-in-out hover:scale-105"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Validate CSV
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-start mt-2">
                <Button
                  onClick={handleDownloadCsv}
                  disabled={validationRecords.length === 0 || isLoadingCsv || isRetryingFailed}
                  variant="outline"
                  className="w-full sm:w-auto transition-transform duration-150 ease-in-out hover:scale-105"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Results
                </Button>
                {retryableFailedRows.length > 0 && !isLoadingCsv && !isRetryingFailed && (
                   <Button 
                    onClick={handleRetryFailedValidations} 
                    variant="secondary"
                    className="w-full sm:w-auto transition-transform duration-150 ease-in-out hover:scale-105"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry {retryableFailedRows.length} Failed
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg rounded-lg transition-all duration-200 ease-in-out hover:shadow-xl">
            <CardHeader>
              <CardTitle>App Category Validation Records</CardTitle>
              <CardDescription>Displaying the latest {validationRecords.length} validation results.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[60vh] border rounded-md">
                <Table className="min-w-[60rem]">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[150px] px-4 py-3">App Name</TableHead>
                      <TableHead className="w-[150px] px-4 py-3">Original Category</TableHead>
                      <TableHead className="w-[120px] px-4 py-3">Status</TableHead>
                      <TableHead className="min-w-[250px] max-w-[350px] px-4 py-3">Description</TableHead>
                      <TableHead className="min-w-[250px] max-w-[350px] px-4 py-3">Validation Reason</TableHead>
                      <TableHead className="w-[180px] text-right px-4 py-3">Checked At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationRecords.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium px-4 py-3 align-top">{record.app}</TableCell>
                        <TableCell className="px-4 py-3 align-top">
                          <div className="flex items-center">
                            <Tag className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                            {record.originalCategory}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 align-top">
                          {record.isValidCategory ? (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="mr-1 h-4 w-4" />
                              Invalid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground px-4 py-3 align-top"> 
                           <TruncatedTextCell text={record.description} title="Full App Description" maxLength={120} />
                        </TableCell>
                        <TableCell className="text-sm px-4 py-3 align-top"> 
                           <TruncatedTextCell text={record.validationReason} title="Full Validation Reason" maxLength={100} />
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground px-4 py-3 align-top">
                          {isMounted ? formatTimestamp(record.checkedAt) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
               {validationRecords.length === 0 && !isLoadingCsv && !isRetryingFailed && (
                <div className="text-center py-10 text-muted-foreground">
                  No validation records found. Upload a CSV to begin.
                </div>
              )}
            </CardContent>
          </Card>
        </main>
        <footer className="py-6 md:px-8 md:py-0 border-t">
          <div className="container flex flex-col items-center justify-center gap-4 md:h-20 md:flex-row">
            <p className="text-sm leading-loose text-muted-foreground text-center md:text-left">
              Built by Firebase Studio.
            </p>
          </div>
        </footer>
      </div>
  );
}
    

    
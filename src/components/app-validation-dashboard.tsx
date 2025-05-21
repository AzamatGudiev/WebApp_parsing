
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, XCircle, Info, Tag, Loader2, ShieldCheck, Download, AlertTriangle } from "lucide-react";
import type { AppCategoryCheck } from "@/types";
import { formatTimestamp } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import { validateAppCategory, type ValidateAppCategoryInput } from "@/ai/flows/validate-app-category";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from '@/lib/utils';

interface AppValidationDashboardProps {
  initialValidationRecords: AppCategoryCheck[];
}

interface FailedRowData {
  appName: string;
  description: string;
  category: string;
  errorReason: string;
}

const REQUEST_DELAY_MS = 2000; // Delay between AI requests to avoid rate limiting (2 seconds)

export function AppValidationDashboard({ initialValidationRecords }: AppValidationDashboardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoadingCsv, setIsLoadingCsv] = useState(false);
  const [validationRecords, setValidationRecords] = useState<AppCategoryCheck[]>(initialValidationRecords);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setValidationRecords(initialValidationRecords);
  }, [initialValidationRecords]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
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

  const downloadCsv = (filename: string, csvString: string) => {
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

  const handleValidateCsv = async () => {
    if (!file) {
      toast({ title: "No file selected", description: "Please select a CSV file to validate.", variant: "destructive" });
      return;
    }
    setIsLoadingCsv(true);
    toast({ title: "Processing CSV...", description: "Displaying results live. Please wait, this may take a while for larger files due to API rate limits.", variant: "default", duration: 10000});

    const failedRows: FailedRowData[] = [];

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
      let processedCount = 0;

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
          console.warn(`Skipping row ${i + 1} (data line ${i+1}) due to missing data. Row content: ${rowString}`);
          toast({ title: "Skipped Row", description: `Data line ${i + 1} in CSV has missing data and was skipped.`, variant: "default", duration: 5000 });
          failedRows.push({ appName: appName || 'N/A', description: description || 'N/A', category: category || 'N/A', errorReason: 'Missing data in row' });
          continue;
        }
        
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

          setValidationRecords(prevRecords =>
            [newRecord, ...prevRecords].sort((a, b) => {
              const aTime = typeof a.checkedAt === 'string' ? new Date(a.checkedAt).getTime() / 1000 : a.checkedAt.seconds;
              const bTime = typeof b.checkedAt === 'string' ? new Date(b.checkedAt).getTime() / 1000 : b.checkedAt.seconds;
              return bTime - aTime;
            })
          );
          processedCount++;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Unknown AI validation error.";
          console.error(`Error validating app ${appName} from CSV:`, err);
          toast({ title: `Error validating ${appName}`, description: `This app entry could not be validated. ${errorMessage}`, variant: "destructive", duration: 7000});
          failedRows.push({ appName, description, category, errorReason: errorMessage });
        }

        if (i < dataRows.length - 1) {
          await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS));
        }
      }

      toast({ title: "CSV Validation Complete", description: `${processedCount} of ${dataRows.length} records processed successfully.` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown CSV processing error.";
      console.error("Error validating CSV:", error);
      toast({ title: "Error Processing CSV", description: `Could not process the CSV file. ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsLoadingCsv(false);
      setFile(null);
      const fileInputElement = document.getElementById('csv-upload') as HTMLInputElement;
      if (fileInputElement) {
          fileInputElement.value = '';
      }

      if (failedRows.length > 0) {
        const failedHeaders = ["App Name", "Description", "Category", "Error Reason"];
        const failedCsvRows = [
          failedHeaders.join(','),
          ...failedRows.map(row => [
            escapeCsvField(row.appName),
            escapeCsvField(row.description),
            escapeCsvField(row.category),
            escapeCsvField(row.errorReason)
          ].join(','))
        ];
        const failedCsvString = failedCsvRows.join('\r\n');
        downloadCsv('failed_app_validations.csv', failedCsvString);
        toast({
          title: "Failed Rows Exported",
          description: `${failedRows.length} app(s) could not be processed and have been saved to 'failed_app_validations.csv'.`,
          variant: "default",
          duration: 10000,
          action: (
            <Button variant="ghost" size="sm" onClick={() => downloadCsv('failed_app_validations.csv', failedCsvString)}>
              <Download className="mr-2 h-4 w-4" /> Download Again
            </Button>
          )
        });
      }
    }
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
    downloadCsv('validation_results.csv', csvString);
    toast({ title: "Download Started", description: "Your CSV file 'validation_results.csv' is being downloaded." });
  };


  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center">
            <ShieldCheck className="h-7 w-7 mr-2 text-primary" />
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
              <CardDescription>Upload a CSV file (appName, description, category) or download existing results.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 items-center flex-grow">
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="flex-grow"
                  aria-label="Upload CSV file"
                />
                <Button 
                  onClick={handleValidateCsv} 
                  disabled={isLoadingCsv || !file} 
                  className="w-full sm:w-auto transition-transform duration-150 ease-in-out hover:scale-105"
                >
                  {isLoadingCsv ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
                  Validate CSV
                </Button>
              </div>
              <Button
                onClick={handleDownloadCsv}
                disabled={validationRecords.length === 0 && !isLoadingCsv}
                variant="outline"
                className="w-full sm:w-auto mt-4 sm:mt-0 transition-transform duration-150 ease-in-out hover:scale-105"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Results
              </Button>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg rounded-lg transition-all duration-200 ease-in-out hover:shadow-xl">
            <CardHeader>
              <CardTitle>App Category Validation Records</CardTitle>
              <CardDescription>Displaying the latest {validationRecords.length} validation results.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[60vh]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[150px]">App Name</TableHead>
                      <TableHead className="w-[150px]">Original Category</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="min-w-[250px]">Validation Reason</TableHead>
                      <TableHead className="w-[180px] text-right">Checked At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.app}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                            {record.originalCategory}
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.isValidCategory ? (
                            <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-emerald-foreground">
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
                        <TableCell className="text-sm text-muted-foreground max-w-xs md:max-w-md">
                           <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="truncate cursor-default">{record.description}</p>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="start" className="max-w-sm bg-popover text-popover-foreground p-2 rounded shadow-lg border">
                                <p>{record.description}</p>
                              </TooltipContent>
                            </Tooltip>
                        </TableCell>
                        <TableCell className="text-sm italic max-w-xs md:max-w-md">
                           <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-start">
                                  <Info size={16} className="mr-2 mt-0.5 shrink-0 text-muted-foreground"/>
                                  <p className="truncate cursor-default">{record.validationReason}</p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="start" className="max-w-sm bg-popover text-popover-foreground p-2 rounded shadow-lg border">
                                <p>{record.validationReason}</p>
                              </TooltipContent>
                            </Tooltip>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {isMounted ? formatTimestamp(record.checkedAt) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
               {validationRecords.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  No validation records found.
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
    </TooltipProvider>
  );
}

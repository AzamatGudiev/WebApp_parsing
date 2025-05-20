import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Tag, CheckCircle2, XCircle, Info } from "lucide-react";
import type { AppCategoryCheck } from "@/types";
import { formatTimestamp } from "@/lib/date-utils";
import { PageHeader } from "@/components/shared/page-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Simulate fetching data from the HTTP-triggered Firebase Function
// In a real app, this would be an actual fetch call:
// const response = await fetch('YOUR_FIREBASE_FUNCTION_URL/getValidations');
// const data = await response.json();
async function getValidationData(): Promise<AppCategoryCheck[]> {
  // Mock data representing the last 100 validation records
  const mockData: AppCategoryCheck[] = [
    {
      id: "1",
      app: "PhotoMaestro Pro",
      description: "An advanced photo editing suite for professionals, offering RAW processing, layer management, and intricate retouching tools.",
      originalCategory: "Photography",
      isValidCategory: true,
      validationReason: "The description clearly indicates features typical of a professional photography application.",
      checkedAt: { seconds: Date.now() / 1000 - 3600 * 24 * 1, nanoseconds: 0 }, // 1 day ago
    },
    {
      id: "2",
      app: "FitPal Journey",
      description: "Track your daily workouts, monitor calorie intake, log water consumption, and join community fitness challenges.",
      originalCategory: "Gaming",
      isValidCategory: false,
      validationReason: "Description aligns with Health & Fitness category, not Gaming. It focuses on physical activity and diet tracking.",
      checkedAt: { seconds: Date.now() / 1000 - 3600 * 24 * 2, nanoseconds: 0 }, // 2 days ago
    },
    {
      id: "3",
      app: "CodeNinja IDE",
      description: "A powerful Integrated Development Environment for Python, JavaScript, and Java, featuring smart autocompletion and debugging.",
      originalCategory: "Productivity",
      isValidCategory: true,
      validationReason: "The app is described as an IDE, which is a standard tool for productivity in software development.",
      checkedAt: { seconds: Date.now() / 1000 - 3600 * 24 * 3, nanoseconds: 0 }, // 3 days ago
    },
    {
      id: "4",
      app: "Chef's Recipe Book",
      description: "Discover thousands of recipes, create meal plans, and generate shopping lists. Learn new cooking techniques with video tutorials.",
      originalCategory: "Social Networking",
      isValidCategory: false,
      validationReason: "This app is focused on cooking and recipes, fitting a Food & Drink or Lifestyle category, not Social Networking.",
      checkedAt: { seconds: Date.now() / 1000 - 3600 * 24 * 4, nanoseconds: 0 }, // 4 days ago
    },
    {
      id: "5",
      app: "Starship Odyssey",
      description: "Embark on an epic space adventure! Explore galaxies, battle alien fleets, and customize your starship in this immersive RPG.",
      originalCategory: "Games",
      isValidCategory: true,
      validationReason: "The description perfectly matches a space-themed role-playing game (RPG).",
      checkedAt: { seconds: Date.now() / 1000 - 3600 * 24 * 5, nanoseconds: 0 }, // 5 days ago
    },
     {
      id: "6",
      app: "Mindful Moments",
      description: "Guided meditations, breathing exercises, and calming soundscapes to help you relax and de-stress.",
      originalCategory: "Health & Fitness",
      isValidCategory: true,
      validationReason: "The features described are characteristic of a meditation and mindfulness app within the Health & Fitness category.",
      checkedAt: { seconds: Date.now() / 1000 - 3600 * 24 * 6, nanoseconds: 0 }, 
    },
    {
      id: "7",
      app: "Global News Hub",
      description: "Stay updated with the latest breaking news from around the world, covering politics, technology, and entertainment.",
      originalCategory: "Travel",
      isValidCategory: false,
      validationReason: "This app provides news updates, placing it in the News & Magazines category, not Travel.",
      checkedAt: { seconds: Date.now() / 1000 - 3600 * 24 * 7, nanoseconds: 0 },
    }
  ];
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockData.sort((a, b) => (b.checkedAt as {seconds: number}).seconds - (a.checkedAt as {seconds: number}).seconds);
}

export default async function Home() {
  const validationRecords = await getValidationData();

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center">
            <ShieldCheck className="h-7 w-7 mr-2 text-primary" />
            <h1 className="text-xl font-semibold">Category Cop</h1>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 container mx-auto">
          <PageHeader 
            title="Validation Dashboard"
            description="Overview of recent app category validations."
          />
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>App Category Validation Records</CardTitle>
              <CardDescription>Displaying the latest {validationRecords.length} validation results.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-20rem)] md:h-auto md:max-h-[calc(100vh-22rem)]"> {/* Adjust height as needed */}
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
                        <TableCell className="text-sm text-muted-foreground max-w-md">
                           <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="truncate cursor-default">{record.description}</p>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="start" className="max-w-sm bg-popover text-popover-foreground p-2 rounded shadow-lg border">
                                <p>{record.description}</p>
                              </TooltipContent>
                            </Tooltip>
                        </TableCell>
                        <TableCell className="text-sm italic max-w-md">
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
                          {formatTimestamp(record.checkedAt)}
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

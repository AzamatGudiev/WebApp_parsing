
import { AppValidationDashboard } from "@/components/app-validation-dashboard";
import type { AppCategoryCheck } from "@/types";

// Simulate fetching data from an API or database
async function getValidationData(): Promise<AppCategoryCheck[]> {
  // Mock data representing validation records
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
  return mockData.sort((a, b) => {
    const aTime = typeof a.checkedAt === 'string' ? new Date(a.checkedAt).getTime() / 1000 : a.checkedAt.seconds;
    const bTime = typeof b.checkedAt === 'string' ? new Date(b.checkedAt).getTime() / 1000 : b.checkedAt.seconds;
    return bTime - aTime;
  });
}

export default async function Home() {
  const initialValidationRecords = await getValidationData();

  return (
    <AppValidationDashboard initialValidationRecords={initialValidationRecords} />
  );
}

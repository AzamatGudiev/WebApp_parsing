export interface AppCategoryCheck {
  id: string; // Firestore document ID
  app: string;
  description: string;
  originalCategory: string;
  isValidCategory: boolean;
  validationReason: string;
  checkedAt: { // Firestore Timestamp structure
    seconds: number;
    nanoseconds: number;
  } | string; // Allow string for easier mock data, convert to Date object later
}

# **App Name**: Category Cop

## Core Features:

- File Listener: Listen for CSV file uploads in Cloud Storage.
- CSV Parser: Parse CSV files, extracting 'app', 'description', and 'category' fields.
- AI Category Validation: Use AI to validate if a product description matches its assigned category and tool to choose whether it will validate or not. Includes a reason for the validation result.
- Result Writer: Write validation results back to a new CSV file in Cloud Storage with added 'is_valid_category' and 'validation_reason' columns.
- Data Retrieval: Provide an HTTP-triggered function to retrieve the last 100 validation records from Firestore as JSON.

## Style Guidelines:

- Primary color: Soft blue (#64B5F6), reminiscent of cloud services and data processing.
- Background color: Light gray (#F0F4F7), providing a clean and neutral backdrop.
- Accent color: Complementary orange (#FFB74D) to highlight important validation results or actions.
- Clean and readable sans-serif font.
- Use icons to represent categories and validation status.
- Structured layout for data presentation and easy navigation.
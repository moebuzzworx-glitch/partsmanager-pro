# Stock Manager

A modern stock management application built with Next.js 15, TypeScript, Tailwind CSS, and Firebase.

⚠️ **IMPORTANT**: This software is proprietary. Unauthorized copying, distribution, or use is prohibited. See [LICENSE.md](LICENSE.md) for details.

## Features

- **User Dashboard**: Overview of inventory, sales, and analytics
- **Admin Dashboard**: System administration, user management, audit logs
- **Invoice System**: Create and generate PDF invoices with automatic numbering
- **Multi-language Support**: English, French, and Arabic (with RTL support)
- **Product Management**: Add, edit, and manage products
- **Customer & Supplier Management**: Manage business relationships
- **Dark Mode**: Theme switcher for light/dark mode
- **Role-Based Access**: Admin and User roles with access control

## License

This project is protected under a proprietary license. See [LICENSE.md](LICENSE.md) for details.

**⛔ Do NOT:**
- Download/scrape this app using tools like SaveWeb2Zip
- Clone and host on another domain
- Copy or redistribute without permission
- Use commercially without a license agreement

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase project (optional, for backend integration)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) in your browser. The app supports multiple locales:
- English: `/en/*`
- French: `/fr/*`
- Arabic: `/ar/*`

### Build

```bash
npm run build
npm start
```

## Project Structure

```
├── src/
│   ├── app/                 # Next.js app directory with layouts and pages
│   │   ├── [locale]/       # Locale-based routing (en, fr, ar)
│   │   ├── dashboard/      # User dashboard
│   │   └── admin/          # Admin dashboard
│   ├── components/         # React components
│   │   ├── ui/            # Radix UI components
│   │   ├── admin/         # Admin-specific components
│   │   └── dashboard/     # Dashboard components
│   ├── firebase/          # Firebase configuration
│   ├── hooks/             # Custom React hooks
│   └── lib/               # Utility functions and types
├── public/                # Static assets
├── firestore.rules        # Firebase Firestore security rules
└── package.json          # Dependencies and scripts
```

## Technologies

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS + Custom Design System
- **UI Components**: Radix UI
- **Forms**: React Hook Form + Zod
- **Database**: Firebase Firestore
- **PDF Generation**: jsPDF
- **Icons**: Lucide React
- **Internationalization**: Custom getDictionary function

## Available Scripts

- `npm run dev` - Start development server (port 9002)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Type checking with TypeScript

## Key Pages

### User Dashboard
- **Route**: `/en/dashboard` (or `/fr/dashboard`, `/ar/dashboard`)
- **Features**: Revenue overview, sales metrics, product inventory, low stock alerts

### Admin Dashboard
- **Route**: `/en/admin`
- **Features**: User management, analytics, audit logs, system settings, backup/restore

### Stock Management
- **Route**: `/en/dashboard/stock`
- **Features**: Add/edit products, batch import, inventory tracking

### Invoicing
- **Route**: `/en/dashboard/invoices`
- **Features**: Create invoices, PDF generation, invoice history

### Settings
- **Route**: `/en/dashboard/settings`
- **Features**: Company information, business rules, billing settings

## Design System

### Colors
- **Primary**: Purple (`hsl(262.1 83.3% 57.8%)`)
- **Accent**: Used for hover states and active elements
- **Background**: Adaptive to light/dark mode

### Typography
- **Headlines**: Montserrat font family
- **Body**: Roboto font family

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Proprietary

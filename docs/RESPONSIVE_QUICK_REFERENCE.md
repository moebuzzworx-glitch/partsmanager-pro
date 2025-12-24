# Responsive Design Quick Reference

## Quick Start for Developers

### Import Utilities
```tsx
import { 
  RESPONSIVE_PADDING, 
  RESPONSIVE_GRID, 
  getResponsiveClasses 
} from '@/lib/responsive-utils';

import { 
  responsivePatterns,
  createResponsiveVariant,
  matchesBreakpoint 
} from '@/lib/responsive-patterns';
```

## Common Responsive Patterns

### Modal Dialog
```tsx
<Dialog>
  <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
    {/* Content */}
  </DialogContent>
</Dialog>
```

### Responsive Grid Form
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
  <FormField name="field1" />
  <FormField name="field2" />
</div>
```

### Responsive Page Header
```tsx
<div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
  <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
  <Button>Action</Button>
</div>
```

### Responsive Stats Grid
```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  <StatsCard />
  <StatsCard />
</div>
```

### Responsive Table
```tsx
<div className="relative w-full overflow-x-auto -mx-4 sm:mx-0">
  <table className="w-full text-xs sm:text-sm">
    {/* Table content */}
  </table>
</div>
```

## Breakpoints
- **Mobile (default)**: 0-639px
- **sm**: 640px+ (tablets, landscape phones)
- **md**: 768px+ (tablets, small desktops)
- **lg**: 1024px+ (desktops)
- **xl**: 1280px+ (large desktops)
- **2xl**: 1536px+ (ultra-wide)

## Responsive Classes Syntax

### Format: `[property-mobile] sm:[property-tablet] md:[property-desktop]`

**Examples:**
```
text-sm sm:text-base md:text-lg         // Responsive text size
p-4 sm:p-6 md:p-8                        // Responsive padding
gap-3 sm:gap-4 md:gap-6                  // Responsive gap
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4  // Responsive grid columns
hidden md:block                           // Hide on mobile, show on desktop
md:hidden                                 // Hide on desktop, show on mobile
```

## Mobile-First Best Practices

1. **Start with Mobile Styles**
   ```tsx
   // ✅ Good
   <div className="flex flex-col sm:flex-row">
   
   // ❌ Avoid
   <div className="flex-row sm:flex-col">
   ```

2. **Use Responsive Utilities**
   ```tsx
   // ✅ Good
   className={getResponsiveClasses.form()}
   
   // ❌ Avoid
   className="space-y-6 p-6"  // Not responsive
   ```

3. **Progressive Enhancement**
   ```tsx
   // ✅ Good - Mobile first, enhance with larger screens
   <div className="text-sm sm:text-base">
   
   // ❌ Avoid - Desktop first
   <div className="text-base sm:text-sm">
   ```

## Component Template

### Responsive Modal Template
```tsx
export function MyModal() {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{buttonText}</Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[500px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-6">
          {/* Form content */}
        </div>
        
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-3 sm:gap-0">
          <Button variant="outline">{cancelText}</Button>
          <Button>{submitText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Responsive Form Grid Template
```tsx
export function MyForm() {
  return (
    <form className="space-y-6 p-4 sm:p-6">
      {/* Full width fields */}
      <FormField name="fullWidth" />
      
      {/* Two column fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <FormField name="field1" />
        <FormField name="field2" />
      </div>
      
      {/* Buttons */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-3 sm:gap-0">
        <Button variant="outline">{cancelText}</Button>
        <Button type="submit">{submitText}</Button>
      </div>
    </form>
  );
}
```

## Testing on Real Devices

### Chrome DevTools
1. Press F12 to open DevTools
2. Click the device toolbar icon (Ctrl+Shift+M)
3. Select device or choose custom dimensions
4. Test at 320px, 768px, and 1024px widths

### Actual Device Testing
- Test on actual phones (iOS and Android)
- Test on tablets (both landscape and portrait)
- Test on different desktop resolutions
- Use orientation change to verify responsive behavior

## Common Responsive Adjustments

### Hiding/Showing Content
```tsx
{/* Show only on mobile */}
<div className="sm:hidden">Mobile Only</div>

{/* Show only on tablet and up */}
<div className="hidden sm:block">Tablet+</div>

{/* Show only on desktop */}
<div className="hidden lg:block">Desktop</div>
```

### Responsive Container Queries
```tsx
{/* Full width on mobile, fixed width on desktop */}
<div className="w-full max-w-6xl mx-auto">
  {/* Auto padding for mobile */}
  <div className="px-4 sm:px-6 md:px-8">
```

### Touch Target Sizing
```tsx
{/* Minimum 44x44px tap target on mobile */}
<button className="h-10 w-10 sm:h-9 sm:w-9">
  {/* Larger on mobile for touch, smaller on desktop */}
</button>
```

## Responsive State Management

### Using Breakpoint Hook
```tsx
import { useIsMobile } from '@/hooks/use-mobile';

export function MyComponent() {
  const isMobile = useIsMobile();
  
  return (
    <div>
      {isMobile ? (
        <MobileLayout />
      ) : (
        <DesktopLayout />
      )}
    </div>
  );
}
```

### Using matchesBreakpoint Helper
```tsx
import { matchesBreakpoint } from '@/lib/responsive-patterns';

if (matchesBreakpoint('lg')) {
  // Desktop layout logic
}
```

## Troubleshooting

### Dialog Not Responsive?
✅ Check: `w-[calc(100%-2rem)]` for mobile, `sm:max-w-[500px]` for desktop

### Grid Not Changing?
✅ Check: `grid-cols-1 md:grid-cols-2` (mobile first, tablet+)

### Text Not Scaling?
✅ Check: `text-sm sm:text-base` (smaller mobile, larger desktop)

### Overflow Issues?
✅ Check: `overflow-y-auto` for modals, `overflow-x-auto` for tables

## Performance Tips

1. **Minimize CSS Classes**: Use Tailwind's responsive prefixes, not separate classes
2. **Mobile-First Loading**: Base styles apply to all devices, responsive classes enhance
3. **Avoid Media Query Hacks**: Use Tailwind breakpoints instead of custom CSS
4. **Test Performance**: Use DevTools to check layout shifts and repaints
5. **Lazy Load Images**: Use responsive image sizes for different devices

---

**For detailed documentation, see**: `docs/RESPONSIVE_DESIGN_GUIDE.md`

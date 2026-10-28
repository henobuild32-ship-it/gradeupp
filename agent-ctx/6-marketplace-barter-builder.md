# Task 6 - marketplace-barter-builder

## Completed Screens

All 9 screen components have been created at `/home/z/my-project/src/components/screens/`:

1. **MarketplaceScreen.tsx** - Product grid with search bar, category filter tabs (Tout, Design, Templates, Services, Digital), product cards with gradient placeholders, "Acheter" button, empty state
2. **MarketplaceDetailScreen.tsx** - Full product detail with gradient image, price, seller info, bonus balance notice, purchase flow with success dialog showing bonus/real split
3. **BarterScreen.tsx** - Barter offer listing with search, category filters (Tout, Services, Produits, Compétences), offer cards with category badges, floating action button
4. **BarterDetailScreen.tsx** - Offer detail with chat integration, create chat via API, send messages, auto-refresh every 3s
5. **BarterCreateScreen.tsx** - Form with title, description, category select, offered/wanted items, submit to API
7. **NotificationsScreen.tsx** - Notification list with type-based icons (DollarSign, Shield, Gift, etc.), relative timestamps, unread dot, mark as read, mark all
8. **SettingsScreen.tsx** - Profile card with avatar, security settings, dark mode toggle (connected to store), language, PWA install, about, logout button
9. **ProfileScreen.tsx** - Avatar with initials, editable name/pseudo/country, read-only phone, balance info (real + bonus with non-withdrawable note)

## API Integration

- `/api/marketplace/products` - GET with optional category filter
- `/api/marketplace/purchase` - POST with productId/buyerId
- `/api/barter/offers` - GET all offers, POST create offer
- `/api/barter/chat` - POST create chat or send message, GET messages by chatId
- `/api/notifications` - GET by userId, POST mark as read
- `/api/notifications/mark-all` - POST mark all as read
- `/api/auth/profile` - POST update profile

## Store Integration

- Uses `useAppStore` from `@/lib/store`
- Navigation via `navigateTo` / `goBack`
- `pageParams` for passing productId/offerId
- `user` for auth context
- `isDarkMode` / `toggleTheme` for settings
- `setNotifications` / `markAsRead` for notifications
- `setUser` for updating user balance after purchase

## Code Quality

- ESLint passes with zero errors
- All components are default exports with 'use client'
- Mobile-first responsive design
- Loading states with Skeleton
- Toast notifications via sonner
- Animations via framer-motion
- Emerald/green financial theme throughout

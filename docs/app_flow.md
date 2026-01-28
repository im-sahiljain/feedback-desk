# Complete Application Architecture Documentation

## Table of Contents
1. [Summary of All Changes](#summary-of-all-changes)
2. [Before vs After Architecture](#before-vs-after-architecture)
3. [Benefits of New Approach](#benefits-of-new-approach)
4. [Data Storage Strategy](#data-storage-strategy)
5. [Complete Application Flow](#complete-application-flow)

---

## Summary of All Changes

### Phase 1: AppContext Simplification
**Goal**: Remove all data management from AppContext, keep only theme management

#### Files Modified:
1. **[AppContext.tsx](file:///home/sahil/feedback-desk/context/AppContext.tsx)**
   - **Before**: Managed products, feedback, user, userRole (225 lines)
   - **After**: Only manages theme and currentProduct (75 lines)
   - **Removed**: All data fetching, `getProductFeedback`, `addProduct`, etc.

2. **[Dashboard](file:///home/sahil/feedback-desk/app/page.tsx)**
   - Added local `useState` for feedback
   - Fetches feedback via `/api/feedbacks?product_id=X`
   - Maps backend objects (`sentiment`, `category`, `priority`) to extract `.label`

3. **[Feedback Page](file:///home/sahil/feedback-desk/app/feedback/page.tsx)**
   - Added local `useState` for feedback
   - Implements local filtering (sentiment, priority)
   - Removed `userRole` dependencies

4. **[Insights Page](file:///home/sahil/feedback-desk/app/insights/page.tsx)**
   - Added local `useState` for feedback
   - All analytics computed locally
   - Fixed duplicate key issues in category mapping

5. **[Products Page](file:///home/sahil/feedback-desk/app/products/page.tsx)**
   - Already had local product fetching
   - Updated `handleCopyLink` to use server-side auth

6. **[Settings Page](file:///home/sahil/feedback-desk/app/settings/page.tsx)**
   - Fetches products locally
   - Placeholder for save (backend endpoint missing)

### Phase 2: Product Selector with Loading State
**Goal**: Add product dropdown to sidebar with loading feedback

#### Files Modified:
1. **[AppContext.tsx](file:///home/sahil/feedback-desk/context/AppContext.tsx)** - Added:
   ```typescript
   currentProduct: Product | null
   setCurrentProduct: (product: Product | null) => void
   isLoadingProduct: boolean
   setIsLoadingProduct: (loading: boolean) => void
   products: Product[]  // Global products list
   ```

2. **[LoadingBackdrop.tsx](file:///home/sahil/feedback-desk/components/layout/LoadingBackdrop.tsx)** - **NEW**
   - Full-screen overlay with spinner
   - Shows when `isLoadingProduct = true`

3. **[AppSidebar.tsx](file:///home/sahil/feedback-desk/components/layout/AppSidebar.tsx)**
   - Added product dropdown with icons
   - Uses `products` from AppContext (no local fetching)
   - Triggers loading state on product change

4. **[AppLayout.tsx](file:///home/sahil/feedback-desk/components/layout/AppLayout.tsx)**
   - Added `<LoadingBackdrop />` component

### Phase 3: Backend Data Mapping Fix
**Goal**: Handle backend API response structure correctly

#### All Pages Updated:
- Backend returns `{label, confidence, ...}` objects for:
  - `sentiment` → Extract `.label?.toLowerCase()`
  - `category` → Extract `.label`
  - `priority` → Extract `.label?.toLowerCase()`

---

## Before vs After Architecture

### Before: Centralized Data in Context

```
┌─────────────────────────────────────┐
│           AppContext                │
│  - Fetches ALL products             │
│  - Fetches ALL feedback             │
│  - Manages user, userRole           │
│  - Updates on mutations             │
└──────────────┬──────────────────────┘
               │ (provides data)
               ↓
    ┌──────────────────────────┐
    │   All Pages Consume      │
    │   - Dashboard            │
    │   - Feedback             │
    │   - Insights             │
    │   - Products             │
    └──────────────────────────┘
```

**Problems**:
- ❌ Context re-renders all consumers on any change
- ❌ Pages couldn't control their own data freshness
- ❌ Complex state management with many methods
- ❌ Tight coupling between pages via shared state
- ❌ Difficult to understand data flow

### After: Decentralized Data + Minimal Context

```
┌─────────────────────────────────────┐
│         AppContext (Minimal)        │
│  - isDarkMode, toggleDarkMode       │
│  - currentProduct                   │
│  - isLoadingProduct                 │
│  - products (list only)             │
└──────────────┬──────────────────────┘
               │ (provides selection state)
               ↓
    ┌──────────────────────────┐
    │   Each Page Autonomous   │
    │                          │
    │  Dashboard:              │
    │   - Fetches feedback     │
    │   - useEffect on         │
    │     currentProduct       │
    │                          │
    │  Feedback:               │
    │   - Fetches feedback     │
    │   - Local filtering      │
    │                          │
    │  Insights:               │
    │   - Fetches feedback     │
    │   - Local analytics      │
    └──────────────────────────┘
```

**Benefits**:
- ✅ Pages only re-render when their data changes
- ✅ Each page controls its own data lifecycle
- ✅ Simple, predictable state management
- ✅ Pages are independent and reusable
- ✅ Clear, explicit data dependencies

---

## Benefits of New Approach

### 1. **Performance**
- **Before**: Changing any data in context re-rendered ALL pages
- **After**: Only the page that fetched new data re-renders
- **Result**: Faster, more responsive UI

### 2. **Maintainability**
- **Before**: Complex context with many methods (`addProduct`, `updateProduct`, `getProductFeedback`, etc.)
- **After**: Simple context with 4 properties
- **Result**: Easier to understand and modify

### 3. **Debugging**
- **Before**: Hard to trace where data comes from (hidden in context)
- **After**: Each page explicitly fetches its data
- **Result**: Easy to debug data flow

### 4. **Flexibility**
- **Before**: All pages share same data, can't customize queries
- **After**: Each page can fetch exactly what it needs
- **Result**: More efficient API usage

### 5. **Testability**
- **Before**: Must mock entire AppContext for tests
- **After**: Pages can be tested independently
- **Result**: Simpler unit tests

### 6. **State Isolation**
- **Before**: Product deletion in one page affects all pages immediately
- **After**: Each page maintains its own state
- **Result**: Predictable, isolated behavior

---

## Data Storage Strategy

### 🍪 **Cookies (httpOnly)**
**What**: Authentication token  
**When Stored**: On successful login/signup  
**When Read**: On every API request (server-side)  
**Why**: Secure, not accessible to JavaScript, prevents XSS attacks

```typescript
// Login API Route
response.cookies.set('token', token, {
  httpOnly: true,    // Not accessible to JavaScript
  secure: true,      // HTTPS only
  sameSite: 'lax',   // CSRF protection
  maxAge: 7 * 24 * 60 * 60  // 7 days
});
```

**Used By**:
- `/api/auth/login` - Sets cookie
- `/api/auth/me` - Reads cookie to get user
- `/api/products/sign-link` - Reads cookie for userId
- All protected API routes

### 💾 **React State (Memory)**
**What**: Current page data, UI state  
**When Stored**: During component lifecycle  
**When Cleared**: On component unmount or page navigation  
**Why**: Fast, temporary, component-specific

```typescript
// Each page manages its own state
const [feedback, setFeedback] = useState<Feedback[]>([]);
const [products, setProducts] = useState<Product[]>([]);
```

**Used By**:
- Dashboard: Feedback for current product
- Feedback Page: Feedback list + filters
- Insights: Feedback for analytics
- Sidebar: Local component state (minimal)

### 🌐 **AppContext (React Context)**
**What**: Global app state (theme, current product)  
**When Stored**: On app load and user actions  
**When Persisted**: Never (reset on page refresh)  
**Why**: Share state across components without prop drilling

```typescript
// Global state in AppContext
{
  isDarkMode: boolean,
  currentProduct: Product | null,
  isLoadingProduct: boolean,
  products: Product[]
}
```

**Used By**:
- All pages: Read `currentProduct` to know which product's data to fetch
- Sidebar: Update `currentProduct` when user selects different product
- Layout: Read `isDarkMode` for theme

### ❌ **localStorage (Not Used)**
**Before**: Considered for storing user data  
**After**: Removed entirely  
**Why**: Security risk, httpOnly cookies are more secure

---

## Complete Application Flow

### 🚀 **App Initialization**

```
1. User visits app
   ↓
2. Next.js loads page
   ↓
3. AppProvider (Context) renders
   ↓
4. useEffect runs → fetch('/api/products')
   ↓
5. Backend validates httpOnly cookie
   ↓
6. Returns products list
   ↓
7. AppContext stores:
   - products: Product[]
   - currentProduct: products[0]
   ↓
8. App renders with first product selected
```

### 🔐 **Authentication Flow**

```
LOGIN:
1. User submits login form
   ↓
2. POST /api/auth/login
   ↓
3. Backend validates credentials
   ↓
4. Backend issues JWT token
   ↓
5. Next.js API route sets httpOnly cookie
   ↓
6. Redirects to dashboard
   ↓
7. AppContext fetches products (cookie auto-sent)

LOGOUT:
1. User clicks logout button
   ↓
2. POST /api/auth/logout
   ↓
3. Backend clears httpOnly cookie
   ↓
4. Redirects to /login
```

### 📊 **Data Fetching Flow (Dashboard Example)**

```
1. Dashboard component mounts
   ↓
2. Reads currentProduct from AppContext
   ↓
3. useEffect triggers:
   if (currentProduct) {
     fetch(`/api/feedbacks?product_id=${currentProduct.id}`)
   }
   ↓
4. Request includes httpOnly cookie automatically
   ↓
5. Next.js API route:
   - Reads cookie
   - Calls backend with Authorization header
   ↓
6. Backend returns feedback data:
   {
     feedback: "...",
     sentiment: { label: "Positive", confidence: 0.99 },
     category: { label: "Bug Report", confidence: 0.95 },
     priority: { label: "High", confidence: 0.87 }
   }
   ↓
7. Frontend maps data:
   sentiment: sentiment?.label?.toLowerCase()
   category: category?.label
   priority: priority?.label?.toLowerCase()
   ↓
8. Updates local state: setFeedback(mappedFeedback)
   ↓
9. Dashboard re-renders with new data
```

### 🔄 **Product Selection Flow**

```
1. User clicks product dropdown in sidebar
   ↓
2. Clicks different product
   ↓
3. handleProductChange(product) runs:
   
   a. setIsLoadingProduct(true)
      → LoadingBackdrop shows
   
   b. setCurrentProduct(newProduct)
      → AppContext updates
   
   c. setTimeout(() => setIsLoadingProduct(false), 800ms)
      → Backdrop hides after delay
   ↓
4. All pages watching currentProduct re-trigger useEffect:

   Dashboard useEffect:
   ↓
   fetch(`/api/feedbacks?product_id=${newProduct.id}`)
   ↓
   setFeedback(newData)
   
   Feedback useEffect:
   ↓
   fetch(`/api/feedbacks?product_id=${newProduct.id}`)
   ↓
   setFeedback(newData)
   
   Insights useEffect:
   ↓
   fetch(`/api/feedbacks?product_id=${newProduct.id}`)
   ↓
   setFeedback(newData)
   ↓
5. All pages update independently
   ↓
6. Loading backdrop disappears
   ↓
7. UI shows new product's data
```

### 🔗 **Copy Feedback Link Flow**

```
1. User clicks "Copy Link" on Products page
   ↓
2. handleCopyLink(product) runs
   ↓
3. POST /api/products/sign-link
   Body: { productId, industry }
   Cookie: token (sent automatically)
   ↓
4. Next.js API route:
   - Reads token from cookie
   - Calls backend GET /api/auth/me
   - Gets userId from response
   ↓
5. Signs parameters:
   signature = signParams({ productId, userId, industry })
   ↓
6. Returns: { signature, userId }
   ↓
7. Frontend constructs URL:
   /submit-feedback/{productId}/{userId}/{industry}?sig={signature}
   ↓
8. Copies to clipboard
   ↓
9. Shows success toast
```

### 🗑️ **Data Lifecycle**

```
┌─────────────────────────────────────────────┐
│  Component Mount                            │
│  ↓                                          │
│  Fetch data from API                        │
│  ↓                                          │
│  Store in local state                       │
│  ↓                                          │
│  Render with data                           │
│  ↓                                          │
│  User interacts / Product changes           │
│  ↓                                          │
│  useEffect re-triggers                      │
│  ↓                                          │
│  Fetch new data                             │
│  ↓                                          │
│  Update state                               │
│  ↓                                          │
│  Re-render                                  │
│  ↓                                          │
│  Component Unmount                          │
│  ↓                                          │
│  State cleared from memory                  │
└─────────────────────────────────────────────┘
```

---

## Key Technical Decisions

### ✅ **What We Use**

1. **httpOnly Cookies** for authentication
   - Secure, immune to XSS
   - Automatically sent with requests
   - Managed server-side

2. **React Context** for minimal global state
   - Theme preference
   - Current product selection
   - Products list (fetched once)

3. **Local Component State** for page data
   - Each page owns its data
   - Fetched on mount and when dependencies change
   - Isolated and independent

4. **Server-Side API Routes** for security
   - Backend can read httpOnly cookies
   - Frontend can't access tokens directly
   - CSRF protection built-in

### ❌ **What We Don't Use**

1. **localStorage for auth** - Security risk
2. **Global state for all data** - Performance issues
3. **Prop drilling** - AppContext handles minimal shared state
4. **Client-side token storage** - httpOnly cookies are safer

---

## Summary

**The new architecture achieves**:
- 🎯 **Simplicity**: Each page fetches only what it needs
- 🔒 **Security**: httpOnly cookies, no client-side token storage
- ⚡ **Performance**: Pages re-render independently
- 🧩 **Modularity**: Pages are self-contained and reusable
- 📊 **Clarity**: Explicit data flow, easy to debug
- 🎨 **UX**: Loading states provide visual feedback

**Data flows**:
- **Auth Token**: httpOnly cookie → Auto-sent with requests
- **Products List**: AppContext → Shared globally, fetched once
- **Current Product**: AppContext → Triggers refetch on change
- **Page Data**: Local state → Fetched per page, isolated
- **Theme**: AppContext → Persists across page changes (in memory)

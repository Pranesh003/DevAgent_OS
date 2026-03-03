New-Item -ItemType Directory -Force -Path "frontend\src\layouts"
New-Item -ItemType Directory -Force -Path "frontend\src\pages\auth"
New-Item -ItemType Directory -Force -Path "frontend\src\pages\dashboard"
New-Item -ItemType Directory -Force -Path "frontend\src\pages\workspace"

Copy-Item "frontend-backup\app\layout.tsx" "frontend\src\layouts\RootLayout.tsx" -Force
Copy-Item "frontend-backup\app\dashboard\layout.tsx" "frontend\src\layouts\DashboardLayout.tsx" -Force
Copy-Item "frontend-backup\app\page.tsx" "frontend\src\pages\Landing.tsx" -Force
Copy-Item "frontend-backup\app\(auth)\login\page.tsx" "frontend\src\pages\auth\Login.tsx" -Force
Copy-Item "frontend-backup\app\(auth)\signup\page.tsx" "frontend\src\pages\auth\Signup.tsx" -Force
Copy-Item "frontend-backup\app\dashboard\page.tsx" "frontend\src\pages\dashboard\index.tsx" -Force
Copy-Item "frontend-backup\app\dashboard\projects\page.tsx" "frontend\src\pages\dashboard\Projects.tsx" -Force
Copy-Item "frontend-backup\app\dashboard\workspace\[id]\page.tsx" "frontend\src\pages\workspace\Workspace.tsx" -Force

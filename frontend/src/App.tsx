import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout/AppLayout'
import { OverviewPage } from '@/pages/OverviewPage/OverviewPage'
import { AnomalyPage } from '@/pages/AnomalyPage/AnomalyPage'
import { RegistryPage } from '@/pages/RegistryPage/RegistryPage'
import { InspectionsPage } from '@/pages/InspectionsPage/InspectionsPage'
import { InspectionReportsPage } from '@/pages/InspectionReportsPage/InspectionReportsPage'
import { NotFoundPage } from '@/pages/NotFoundPage/NotFoundPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="anomaly" element={<AnomalyPage />} />
        <Route path="registry" element={<RegistryPage />} />
        <Route path="inspections" element={<InspectionsPage />} />
        <Route path="inspections/reports" element={<InspectionReportsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App

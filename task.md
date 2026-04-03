# SentinelOps - Build Task List

## Phase 1: Scaffold & Root Config
- [x] task.md
- [x] .env.example
- [x] README.md

## Phase 2: ML Service (Python + FastAPI)
- [x] ml_service/requirements.txt
- [x] ml_service/main.py
- [x] ml_service/models/__init__.py
- [x] ml_service/models/isolation_forest.py
- [x] ml_service/models/svm.py
- [x] ml_service/utils/__init__.py
- [x] ml_service/utils/preprocessor.py
- [x] ml_service/utils/dataset_adapter.py
- [x] ml_service/utils/feature_extractor.py

## Phase 3: Backend Server (Node.js + Express)
- [x] server/package.json + npm install
- [x] server/src/app.js
- [x] server/src/server.js
- [x] server/src/models/User.js
- [x] server/src/models/Dataset.js
- [x] server/src/models/TrafficRecord.js
- [x] server/src/models/AnomalyResult.js
- [x] server/src/models/AuditLog.js
- [x] server/src/middleware/auth.js
- [x] server/src/middleware/upload.js
- [x] server/src/middleware/audit.js
- [x] server/src/middleware/errorHandler.js
- [x] server/src/controllers/authController.js
- [x] server/src/controllers/datasetController.js
- [x] server/src/controllers/analysisController.js
- [x] server/src/controllers/anomalyController.js
- [x] server/src/controllers/dashboardController.js
- [x] server/src/controllers/auditController.js
- [x] server/src/utils/mlClient.js
- [x] server/src/utils/jobQueue.js
- [x] server/src/utils/socketManager.js
- [x] server/src/routes/auth.js
- [x] server/src/routes/datasets.js
- [x] server/src/routes/analysis.js
- [x] server/src/routes/anomalies.js
- [x] server/src/routes/dashboard.js
- [x] server/src/routes/audit.js

## Phase 4: Frontend (React + Vite + Tailwind)
- [x] create-vite scaffold + Tailwind install
- [x] client/tailwind.config.js
- [x] client/src/index.css (design system)
- [x] client/src/main.jsx
- [x] client/src/App.jsx
- [x] client/src/services/api.js
- [x] client/src/services/auth.js
- [x] client/src/services/websocket.js
- [x] client/src/store/authStore.js
- [x] client/src/store/uiStore.js
- [x] client/src/store/anomalyStore.js
- [x] client/src/hooks/useAuth.js
- [x] client/src/hooks/useWebSocket.js
- [x] client/src/hooks/useAnomalies.js
- [x] client/src/components/layout/Sidebar.jsx
- [x] client/src/components/layout/TopBar.jsx
- [x] client/src/components/layout/PageWrapper.jsx
- [x] client/src/components/ui/KPICard.jsx
- [x] client/src/components/ui/RiskBadge.jsx
- [x] client/src/components/ui/DataTable.jsx
- [x] client/src/components/ui/UploadDropzone.jsx
- [x] client/src/components/ui/ProgressRing.jsx
- [x] client/src/components/ui/LiveFeed.jsx
- [x] client/src/components/ui/AlertBanner.jsx
- [x] client/src/components/ui/ConfirmModal.jsx
- [x] client/src/components/ui/FilterPanel.jsx
- [x] client/src/components/ui/ExportButton.jsx
- [x] client/src/components/ui/ToastProvider.jsx
- [x] client/src/components/charts/TrafficChart.jsx
- [x] client/src/components/charts/AnomalyChart.jsx
- [x] client/src/components/charts/ProtocolPie.jsx
- [x] client/src/pages/Login.jsx
- [x] client/src/pages/Dashboard.jsx
- [x] client/src/pages/Datasets.jsx
- [x] client/src/pages/Analysis.jsx
- [x] client/src/pages/Anomalies.jsx
- [x] client/src/pages/AuditLogs.jsx
- [x] client/src/pages/Settings.jsx

## Phase 5: Integration & Polish
- [x] Verify all API routes match frontend calls
- [x] Confirm WebSocket events wire correctly
- [x] Test auth flow end-to-end

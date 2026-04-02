v0.1.109 (Current)
- **Admin Deletion Fix**: Enabled `dev.marckim@gmail.com` and admin-role users to delete projects regardless of ownership.
- **Admin Sample Fix**: Improved diagnostic logging for `/api/admin/samples` and refined frontend error handling in `renderAdminSamples`.
- **System Stability**: Verified Supabase connectivity and data presence for samples.

v0.1.108: Final Stabilization & Cleanup
- Unified AI Model Mapping for Claude 4 series (Sonnet 4.6/Haiku 4.5)
- Robust Project Deletion (Fixed numeric/UUID cross-access for guests)
- Complete removal of unused Netlify (.toml and /netlify folder)
- Verified Server Health and Port 8081 connectivity
- Enhanced AI Proxy JSON recovery logic stability

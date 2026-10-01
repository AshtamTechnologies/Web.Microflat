/**
 * VendorViewPage — Full-page detail route (/vendors/:id)
 * Delegates rendering to the reusable VendorDetailView component.
 */

import { useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { useVendorsContext } from '../../context/VendorsContext';
import VendorDetailView from './VendorDetailView';

export default function VendorViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getVendorById, deleteVendor } = useVendorsContext();

  const backPath = location.state?.from || '/vendors';
  const backLabel = location.state?.backLabel || (backPath === '/vendors/dashboard' ? 'Back to Vendor Dashboard' : 'Back to Vendors List');

  const vendor = useMemo(() => {
    return getVendorById(id);
  }, [id, getVendorById]);

  if (!vendor) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <Card padding="lg" className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">Vendor Not Found</h2>
          <p className="text-sm text-text-muted">
            The requested vendor with ID "{id}" could not be located in the database.
          </p>
          <Button variant="primary" onClick={() => navigate(backPath)}>
            {backLabel}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-16">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-bg hover:bg-surface text-text hover:text-primary border border-border shadow-2xs transition-all duration-150 group cursor-pointer"
        >
          <ArrowLeft size={14} className="text-text-muted group-hover:text-primary group-hover:-translate-x-0.5 transition-transform" />
          <span>{backLabel}</span>
        </button>
      </div>

      <VendorDetailView
        vendor={vendor}
        onDelete={(vendorId) => {
          deleteVendor(vendorId);
          navigate(backPath);
        }}
        isSplitView={false}
      />
    </div>
  );
}

/**
 * ClientViewPage.jsx — Read-only 360-degree Master View for Client Registration.
 *
 * Route: /clients/:id
 * Features:
 *   - Executive header with status chips & 1-click edit navigation
 *   - 3-column Company Details card
 *   - Terms & Notes card
 *   - Responsive card grid for Client Addresses
 *   - Responsive Contact Persons table on md+ with mobile card fallback
 *   - System audit timestamp footer formatted via central dateUtils
 */

import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Building2,
  FileText,
  MapPin,
  Users,
  AlertCircle,
} from 'lucide-react';

import {
  Button,
  Badge,
  Card,
  DetailField,
  TableContainer,
  Th,
  Td,
  PageHeader,
} from '../../components/ui';
import { useClientsContext } from '../../context/ClientsContext';
import {
  getContactTypeBadgeVariant,
  getCountryName,
  getStateName,
  getAddressTypeBadgeVariant,
} from '../../mocks/clients';
import { formatDate } from '../../utils/dateUtils';

export default function ClientViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getClientById } = useClientsContext();

  const client = getClientById(id);

  if (!client) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <Card padding="lg" className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">Client Not Found</h2>
          <p className="text-sm text-text-muted">
            The requested client record with ID "{id}" does not exist or has been removed.
          </p>
          <Button variant="primary" onClick={() => navigate('/clients')}>
            Return to Clients List
          </Button>
        </Card>
      </div>
    );
  }

  const clientId = client.clientId || client.id;
  const addresses = client.addresses || [];
  const contacts = client.contacts || [];

  return (
    <div className="space-y-6 pb-20">
      {/* ── Top Header & Actions ── */}
      <PageHeader
        title={client.companyName}
        subtitle={`Client ID: ${clientId}`}
        backButton={
          <button
            type="button"
            onClick={() => navigate('/clients')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface hover:bg-surface/80 text-text hover:text-primary border border-border shadow-2xs transition-all duration-150 group cursor-pointer"
          >
            <ArrowLeft
              size={14}
              className="text-text-muted group-hover:text-primary group-hover:-translate-x-0.5 transition-transform"
            />
            <span>Back to Clients</span>
          </button>
        }
        badge={
          <div className="flex items-center gap-2">
            <Badge
              variant={getContactTypeBadgeVariant(client.contactTypeId)}
            >
              {client.contactTypeId || 'Customer'}
            </Badge>
            <Badge
              variant={client.isActive ? 'active' : 'inactive'}
            >
              {client.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        }
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate(`/clients/${clientId}/edit`)}
            className="text-xs font-semibold shadow-2xs"
          >
            <Pencil size={14} className="mr-1.5" />
            Edit Client
          </Button>
        }
      />

      {/* ── 1. Company Details Card (3 Columns Layout) ── */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center gap-2.5 border-b border-border pb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Building2 size={17} />
          </div>
          <h3 className="text-sm font-semibold text-heading">Company Details</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DetailField label="Company Name" value={client.companyName} />
          <DetailField label="Billing Name" value={client.billingName || client.companyName || '—'} />
          <DetailField label="Contact Type" value={client.contactTypeId || 'Customer'} />
          <DetailField
            label="Official Email"
            value={
              client.email ? (
                <a
                  href={`mailto:${client.email}`}
                  className="text-primary hover:underline"
                >
                  {client.email}
                </a>
              ) : (
                '—'
              )
            }
          />
          <DetailField
            label="GST Number"
            value={client.gstNo || '—'}
            mono
          />
          <DetailField
            label="Account Status"
            value={
              <span className={client.isActive ? 'text-success font-medium' : 'text-danger font-medium'}>
                {client.isActive ? 'Active' : 'Inactive'}
              </span>
            }
          />
        </div>
      </Card>

      {/* ── 2. Terms & Notes Card ── */}
      {(client.paymentTerms || client.deliveryTerms || client.comments) && (
        <Card padding="md" className="space-y-4">
          <div className="flex items-center gap-2.5 border-b border-border pb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText size={17} />
            </div>
            <h3 className="text-sm font-semibold text-heading">Terms & Notes</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DetailField label="Payment Terms" value={client.paymentTerms || '—'} />
            <DetailField label="Delivery Terms" value={client.deliveryTerms || '—'} />
            <DetailField label="Internal Comments" value={client.comments || '—'} />
          </div>
        </Card>
      )}

      {/* ── 3. Addresses Section (Responsive Cards Grid) ── */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MapPin size={17} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-heading">Client Addresses</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Registered locations, factories, and billing points
              </p>
            </div>
          </div>
          <Badge variant="neutral" className="text-xs font-mono px-2 py-0.5">
            {addresses.length}
          </Badge>
        </div>

        {addresses.length === 0 ? (
          <div className="text-center py-8 text-xs text-text-muted border border-dashed border-border rounded-xl bg-surface/20">
            No addresses on record
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr, idx) => {
              const countryName = getCountryName(addr.countryId);
              const stateName = getStateName(addr.countryId, addr.stateId);

              return (
                <div
                  key={addr.clientAddressId || idx}
                  className="bg-surface/50 border border-border rounded-xl p-4 space-y-2.5 shadow-2xs relative"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <Badge
                      variant={getAddressTypeBadgeVariant(addr.addressType)}
                      className="text-2xs px-2 py-0.5 font-medium"
                    >
                      {addr.addressType}
                    </Badge>
                    {!addr.isActive && (
                      <span className="text-2xs uppercase font-bold text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-heading font-medium space-y-0.5">
                    <p>{addr.address1}</p>
                    {addr.address2 && <p className="text-text-muted">{addr.address2}</p>}
                  </div>

                  <div className="text-xs text-text pt-1 border-t border-border/50 flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{addr.city}</span>
                    {stateName && <span>• {stateName}</span>}
                    <span>• {countryName}</span>
                    {addr.zipCode && (
                      <span className="font-mono tabular-nums text-text-muted">
                        ({addr.zipCode})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── 4. Contact Persons Section ── */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users size={17} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-heading">Contact Persons</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Personnel authorized for purchasing, technical, and finance communication
              </p>
            </div>
          </div>
          <Badge variant="neutral" className="text-xs font-mono px-2 py-0.5">
            {contacts.length}
          </Badge>
        </div>

        {contacts.length === 0 ? (
          <div className="text-center py-8 text-xs text-text-muted border border-dashed border-border rounded-xl bg-surface/20">
            No contact persons on record
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View (md+) */}
            <div className="hidden md:block">
              <TableContainer tableClassName="w-full text-left border-collapse text-xs">
                <thead className="bg-surface/80 border-b border-border">
                    <tr>
                      <Th className="py-2.5 px-3">NAME</Th>
                      <Th className="py-2.5 px-3 w-48">MOBILE 1</Th>
                      <Th className="py-2.5 px-3 w-48">MOBILE 2</Th>
                      <Th className="py-2.5 px-3">EMAIL</Th>
                      <Th className="py-2.5 px-3 w-28 text-center">STATUS</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-bg">
                    {contacts.map((c, idx) => {
                      const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || '—';

                      return (
                        <tr key={c.clientContactPersonId || idx} className="hover:bg-surface/40 transition-colors">
                          <Td className="py-3 px-3 font-semibold text-heading">
                            {fullName}
                          </Td>
                          <Td className="py-3 px-3 font-mono tabular-nums text-text">
                            {c.mobile1 || '—'}
                          </Td>
                          <Td className="py-3 px-3 font-mono tabular-nums text-text-muted">
                            {c.mobile2 || '—'}
                          </Td>
                          <Td className="py-3 px-3 text-text">
                            {c.email ? (
                              <a href={`mailto:${c.email}`} className="text-primary hover:underline">
                                {c.email}
                              </a>
                            ) : (
                              '—'
                            )}
                          </Td>
                          <Td className="py-3 px-3 text-center">
                            <Badge
                              variant={c.isActive ? 'active' : 'inactive'}
                              className="text-2xs px-2 py-0.5"
                            >
                              {c.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
              </TableContainer>
            </div>

            {/* Mobile Stacked Cards (below md) */}
            <div className="block md:hidden space-y-3">
              {contacts.map((c, idx) => {
                const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || '—';

                return (
                  <div
                    key={c.clientContactPersonId || idx}
                    className="bg-surface/50 border border-border rounded-xl p-3.5 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                      <span className="font-semibold text-xs text-heading">{fullName}</span>
                      <Badge
                        variant={c.isActive ? 'active' : 'inactive'}
                        className="text-2xs px-2 py-0.5"
                      >
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-2xs text-text-muted uppercase block">Mobile 1</span>
                        <span className="font-mono tabular-nums font-medium text-heading">
                          {c.mobile1 || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-2xs text-text-muted uppercase block">Mobile 2</span>
                        <span className="font-mono tabular-nums text-text-muted">
                          {c.mobile2 || '—'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-2xs text-text-muted uppercase block">Email</span>
                        <span className="text-text break-all">
                          {c.email || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* ── System Audit Timestamp Footer ── */}
      <div className="text-xs text-text-muted pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span>
          Created on <span className="font-mono tabular-nums font-medium text-heading">{formatDate(client.createdAt)}</span>
        </span>
        {client.updatedAt && (
          <span>
            Last updated on <span className="font-mono tabular-nums font-medium text-heading">{formatDate(client.updatedAt)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

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

import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IconBack,
  IconBuilding2,
  IconClient,
  IconClock,
  IconEdit,
  IconError,
  IconFileText,
  IconLocation,
  IconUsers,
} from '../../constants/icons';

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
import { usePaymentTermsContext } from '../../context/PaymentTermsContext';
import {
  getContactTypeBadgeVariant,
  getCountryName,
  getStateName,
  getAddressTypeBadgeVariant,
} from '../../mocks/clients';
import { formatDate } from '../../utils/dateUtils';
import { getEffectiveDateStatus, formatDateDisplay } from '../../utils/effectiveDateUtils';

export default function ClientViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getClientById } = useClientsContext();
  const { paymentTerms = [] } = usePaymentTermsContext();

  const client = getClientById(id);

  const clientPaymentTermsList = useMemo(() => {
    if (!client?.paymentTerms) return [];
    const raw = client.paymentTerms;
    let items = [];
    if (Array.isArray(raw)) {
      items = raw;
    } else if (typeof raw === 'string' && raw.trim()) {
      if (raw.includes(',')) {
        items = raw.split(',').map((s) => s.trim()).filter(Boolean);
      } else {
        items = [raw.trim()];
      }
    }

    return items.map((val) => {
      const match = paymentTerms.find(
        (pt) =>
          pt.termCode?.toUpperCase() === String(val).toUpperCase() ||
          pt.paymentTermId === val
      );
      if (match) return match;
      return {
        paymentTermId: val,
        termCode: val,
        description: '',
      };
    });
  }, [client?.paymentTerms, paymentTerms]);

  if (!client) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <Card padding="lg" className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mx-auto">
            <IconError size={24} />
          </div>
          <h2 className="text-lg font-bold text-heading">Client Not Found</h2>
          <p className="text-sm text-text-muted">
            The requested client record with ID "{id}" does not exist or has been removed.
          </p>
          <Button variant="primary" onClick={() => navigate('/clients')}>
            Back to Clients
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
        icon={<IconClient className="h-6 w-6 text-primary" aria-hidden="true" />}
        backButton={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={IconBack}
            onClick={() => navigate('/clients')}
          >
            Back to Clients
          </Button>
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
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(`/clients/${clientId}/effective-dates`)}
              className="text-xs font-semibold shadow-2xs"
            >
              <IconClock size={14} className="mr-1.5" />
              Effective Date History
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => navigate(`/clients/${clientId}/edit`)}
              className="text-xs font-semibold shadow-2xs"
            >
              <IconEdit size={14} className="mr-1.5" />
              Edit Client
            </Button>
          </div>
        }
      />

      {/* ── 1. Company Details Card (3 Columns Layout) ── */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center gap-2.5 border-b border-border pb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <IconBuilding2 size={17} />
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
          <DetailField
            label="Effective Date"
            value={
              client.effectiveDate ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono tabular-nums">{formatDateDisplay(client.effectiveDate)}</span>
                  {client.effectiveDate && (
                    <Badge variant={getEffectiveDateStatus(client.effectiveDate).badgeVariant} className="text-2xs px-2 py-0.5">
                      {getEffectiveDateStatus(client.effectiveDate).label}
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(`/clients/${clientId}/effective-dates`)}
                    className="text-2xs text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    (View History)
                  </button>
                </div>
              ) : (
                '—'
              )
            }
          />
        </div>
      </Card>

      {/* ── 2. Terms & Notes Card ── */}
      {(clientPaymentTermsList.length > 0 || client.deliveryTerms || client.comments) && (
        <Card padding="md" className="space-y-4">
          <div className="flex items-center gap-2.5 border-b border-border pb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <IconFileText size={17} />
            </div>
            <h3 className="text-sm font-semibold text-heading">Terms & Notes</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Payment Terms */}
            <div>
              <p className="text-xs font-medium text-text-muted mb-1.5">Payment Terms</p>
              {clientPaymentTermsList.length === 0 ? (
                <span className="text-sm font-semibold text-heading">—</span>
              ) : (
                <div className="space-y-2">
                  {clientPaymentTermsList.map((term) => {
                    const desc = term.description || '';
                    const isHtml = /<[a-z][\s\S]*>/i.test(desc);

                    return (
                      <div
                        key={term.paymentTermId || term.termCode}
                        className="p-2.5 rounded-lg bg-surface/80 border border-border space-y-1.5 text-xs shadow-2xs"
                      >
                        <div>
                          <Badge variant="role" className="font-mono text-2xs px-1.5 py-0.5">
                            {term.termCode}
                          </Badge>
                        </div>
                        {desc ? (
                              isHtml ? (
                                <div
                                  className="text-xs text-text leading-relaxed prose prose-xs max-w-none [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4 [&_p]:my-0.5"
                                  dangerouslySetInnerHTML={{ __html: desc }}
                                />
                              ) : (
                                <p className="text-xs text-text whitespace-pre-line leading-relaxed">
                                  {desc}
                                </p>
                              )
                        ) : (
                          <p className="text-2xs text-text-muted italic">No terms description specified</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Delivery Terms */}
            <div>
              <p className="text-xs font-medium text-text-muted mb-1.5">Delivery Terms</p>
              {client.deliveryTerms ? (
                /<[a-z][\s\S]*>/i.test(client.deliveryTerms) ? (
                  <div
                    className="p-3 rounded-lg bg-surface/60 border border-border text-xs text-text leading-relaxed prose prose-xs max-w-none [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4 [&_p]:my-0.5 shadow-2xs"
                    dangerouslySetInnerHTML={{ __html: client.deliveryTerms }}
                  />
                ) : (
                  <p className="text-xs text-heading font-medium whitespace-pre-line leading-relaxed p-3 rounded-lg bg-surface/60 border border-border shadow-2xs">
                    {client.deliveryTerms}
                  </p>
                )
              ) : (
                <span className="text-xs text-text-muted">—</span>
              )}
            </div>

            {/* Internal Comments */}
            <div>
              <p className="text-xs font-medium text-text-muted mb-1.5">Internal Comments</p>
              {client.comments ? (
                /<[a-z][\s\S]*>/i.test(client.comments) ? (
                  <div
                    className="p-3 rounded-lg bg-surface/60 border border-border text-xs text-text leading-relaxed prose prose-xs max-w-none [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4 [&_p]:my-0.5 shadow-2xs"
                    dangerouslySetInnerHTML={{ __html: client.comments }}
                  />
                ) : (
                  <p className="text-xs text-heading font-medium whitespace-pre-line leading-relaxed p-3 rounded-lg bg-surface/60 border border-border shadow-2xs">
                    {client.comments}
                  </p>
                )
              ) : (
                <span className="text-xs text-text-muted">—</span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ── 3. Addresses Section (Responsive Cards Grid) ── */}
      <Card padding="md" className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <IconLocation size={17} />
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={getAddressTypeBadgeVariant(addr.addressType)}
                        className="text-2xs px-2 py-0.5 font-medium"
                      >
                        {addr.addressType}
                      </Badge>
                      {addr.addressLabel && (
                        <span className="text-xs font-bold text-heading">
                          {addr.addressLabel}
                        </span>
                      )}
                    </div>
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
              <IconUsers size={17} />
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
                      <Th className="py-2.5 px-3 min-w-[160px]">NAME</Th>
                      <Th className="py-2.5 px-3 min-w-[130px] whitespace-nowrap">DESIGNATION</Th>
                      <Th className="py-2.5 px-3 min-w-[130px] whitespace-nowrap">DEPARTMENT</Th>
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{fullName}</span>
                              {c.isPrimary && (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-bold bg-primary/15 text-primary border border-primary/30">
                                  Primary
                                </span>
                              )}
                            </div>
                          </Td>
                          <Td className="py-3 px-3 text-xs text-text">
                            {c.designation ? (
                              <span className="font-medium text-heading">{c.designation}</span>
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </Td>
                          <Td className="py-3 px-3 text-xs text-text">
                            {c.department ? (
                              <span>{c.department}</span>
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-heading">{fullName}</span>
                        {c.isPrimary && (
                          <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-2xs font-bold bg-primary/15 text-primary border border-primary/30">
                            Primary
                          </span>
                        )}
                      </div>
                      <Badge
                        variant={c.isActive ? 'active' : 'inactive'}
                        className="text-2xs px-2 py-0.5"
                      >
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-2xs text-text-muted uppercase block">Designation</span>
                        <span className="font-medium text-heading">
                          {c.designation || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-2xs text-text-muted uppercase block">Department</span>
                        <span className="font-medium text-heading">
                          {c.department || '—'}
                        </span>
                      </div>
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

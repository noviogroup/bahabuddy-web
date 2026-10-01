import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { VendorDealSubmissionForm, VendorProfileSubmissionForm } from '@/components/vendor/VendorForms'
import type { VendorPartner } from '@/lib/vendor-portal'

const partner: VendorPartner = {
  id: 'partner-1', name: 'Rizal Resort', slug: null, partner_type: 'hotel', tier: 'standard', status: 'active',
  contact_name: null, contact_email: null, contact_phone: null, website: null, island_name: 'Nassau',
  description: null, is_featured: false, is_sponsored: false,
}

afterEach(() => vi.unstubAllGlobals())

describe('vendor forms', () => {
  test('a successful submission shows success, not an error (F34)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 's1' }), { status: 201 })))
    render(<VendorDealSubmissionForm partnerId="partner-1" listings={[]} />)
    fireEvent.change(screen.getByLabelText('Deal title'), { target: { value: 'Spa day' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Half price' } })
    fireEvent.submit(screen.getByLabelText('Deal title').closest('form')!)
    expect(await screen.findByRole('status')).toHaveTextContent('Deal proposal submitted for admin review.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Deal title')).toHaveValue('')
  })

  test('view-only partners cannot submit (F39)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<VendorProfileSubmissionForm partner={partner} canSubmit={false} />)
    expect(screen.getByText(/view-only/i)).toBeInTheDocument()
    const submit = screen.getByRole('button', { name: 'Submit profile update' })
    expect(submit).toBeDisabled()
    fireEvent.submit(submit.closest('form')!)
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled())
  })
})

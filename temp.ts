type Temp = {
    Contact: {
        // XEROINVOICE -> XeroInvoice_XeroContact__SessionData::zcontact
        ContactID: string; // Uses @SQL_DataFromRecord to query Dzine file and convert zcontact_id into Customers::xeroCustomerID
        Name: string; // Same as ContactID, but Customers::contactXero
        EmailAddress: string; // Same as ContactID, but Customers::Email Address
        ContactStatus: "ACTIVE";
        AccountsReceivableTaxType: string // TODO: XeroContact_XeroSetup__INFO::tax_type_default
        DefaultCurrency: "NZD";
    },
    CurrecyCode: "NZD",
    Date: string, // DASH_INT::invoicing_FILTER_date as ISO date (YYYY-MM-DD)
    DueDate: string, // Same as Date, +1 month
    LineAmountTypes: "Exclusive",
    LineItems: {
        Description: string, // Uses @SQL_DataFromRecord to query Dzine file and convert zinvoice_item_id into Job Line Items::description_xero
        /**
         * z_invoice_type type defaults to "Tax Invoice". I do not believe this value changes.
         * Quantity is the same as Desctiption, though using the "Quantity" field on the remote table.
         * If z_invoice_type is "Credit Note", quantity must be absolute-ed.
         */
        Quantity: number,
        /**
         * Same as Quantity, though with the "unitAmount" field
         */
        UnitAmount: unknown,
        TaxType: "OUTPUT2",
    }[],
    Reference: string, // Same as Contact.ContactID, though uses zinvoice_id to get Jobs::reference
    Status: "DRAFT",
    Type: "ACCREC",
}

const HEADERS = {
    Authorization: "",
    "xero-tenant-id": "",
    "Accept": "application/json",
    "Content-Type": "application/json",
}


/**
 * Let ( [
 *    ~ID = GetFieldName ( Customers::zzrec_id ) ;
 *    ~Data = GetFieldName ( Customers::xeroCustomerID )
 *    ] ;
 *
 *    @SQL_DataFromRecord ( ~ID ; ~Data ; zcontact_id )
 * )
 */

/**
 * SELECT xeroCustomerId FROM Customers WHERE zzrec_id =? zcontact_id
 */
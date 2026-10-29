"use strict";
const HEADERS = {
    Authorization: "",
    "xero-tenant-id": "",
    "Accept": "application/json",
    "Content-Type": "application/json",
};
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

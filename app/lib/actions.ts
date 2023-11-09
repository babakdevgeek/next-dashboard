'use server'

import { z } from "zod"
import {sql} from '@vercel/postgres'
import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
const InvoiceSchema =z.object({
    id : z.string(),
    customerId:z.string(),
    amount : z.coerce.number(),
    status:z.enum(['pending' , 'paid']),
    date:z.string()
})
const createInvoice = InvoiceSchema.omit({id:true,date:true})

export async function createInvoices(formData:FormData){
    const {customerId,amount,status} = createInvoice.parse({
        customerId:formData.get('customerId'),
        status:formData.get('status'),
        amount: formData.get('amount')
    })
    const amountInCents = amount*100;
    const date = new Date().toISOString().split('T')[0]
    await sql`INSERT INTO invoices (customer_id,amount,status,date)
    VALUES(${customerId} , ${amountInCents} , ${status} ,${date})`
    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/invoices')
}
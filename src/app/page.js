'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Camera, Plus, Minus } from "lucide-react";
import Papa from 'papaparse';
import CustomerSearch from '@/components/ui/customer-search';

const OrderForm = () => {
 const [products, setProducts] = useState([]);
 const [selectedCustomer, setSelectedCustomer] = useState("");
 const [customerSearch, setCustomerSearch] = useState("");
 const [orders, setOrders] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);

 useEffect(() => {
   const loadData = async () => {
     try {
       const productsResponse = await fetch('/data/products.csv');
       const productsText = await productsResponse.text();
       const productsResult = Papa.parse(productsText, {
         header: true,
         skipEmptyLines: true,
         dynamicTyping: true
       });
       
       const validProducts = productsResult.data.filter(product => 
         product['שם מוצר'] && product['מק"ט '] && product['כפולות להזמנה']
       ).map(product => ({
         ...product,
         'תמונה': `/images/${product['שם מוצר'].toLowerCase().replace(/ /g, '-')}.jpg`
       }));
       
       setProducts(validProducts);
       setOrders(validProducts.map(p => ({ 
         productId: p['מק"ט '],
         quantity: 0
       })));
       
       setLoading(false);
     } catch (err) {
       console.error('Error loading data:', err);
       setError('אירעה שגיאה בטעינת הנתונים');
       setLoading(false);
     }
   };

   loadData();
 }, []);

 const totalUnits = orders.reduce((sum, order) => sum + order.quantity, 0);

 const handleQuantityChange = (productId, newValue) => {
   const product = products.find(p => p['מק"ט '] === productId);
   const multiple = product['כפולות להזמנה'];
   const quantity = Math.floor(newValue / multiple) * multiple;
   
   setOrders(orders.map(order => 
     order.productId === productId 
       ? { ...order, quantity: quantity >= 0 ? quantity : 0 }
       : order
   ));
 };

 const adjustQuantity = (productId, adjustment) => {
   const product = products.find(p => p['מק"ט '] === productId);
   const order = orders.find(o => o.productId === productId) || { quantity: 0 };
   const newQuantity = order.quantity + (adjustment * product['כפולות להזמנה']);
   handleQuantityChange(productId, newQuantity);
 };

const submitOrder = async (orderDetails) => {
  try {
    const customerSearchResponse = await fetch('https://api.yeshinvoice.co.il/api/v1/getAllCustomers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': JSON.stringify({
          "secret": "094409be-bb9c-4a51-b3b5-2d15dc2d2154",
          "userkey": "CWKaRN8167zMA5niguEf"
        })
      },
      body: JSON.stringify({
        "PageSize": 1000,
        "PageNumber": 1,
        "Search": orderDetails.לקוח,
        "PortfolioID": 0,
        "orderby": {
          "column": "Name",
          "asc": "asc"
        }
      })
    });

    const customerData = await customerSearchResponse.json();
    const exactCustomer = customerData.ReturnValue.find(c => c.name.includes(orderDetails.לקוח));    
    if (!exactCustomer) {
      throw new Error('לא נמצא לקוח בשם זה');
    }

    const invoiceData = {
      Title: "",
      Notes: `הזמנה מתאריך ${orderDetails.תאריך_הזמנה}`,
      NotesBottom: "",
      CurrencyID: 2,
      LangID: 359,
      SendSMS: false,
      SendEmail: false,
      DocumentType: 2,
      vatPercentage: 18,
      DateCreated: new Date().toISOString().split('T')[0],
      MaxDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      statusID: 1,
      isDraft: false,

      Customer: {
        ID: exactCustomer.id,
        Name: exactCustomer.name,
        NameInvoice: exactCustomer.name
      },

      items: orderDetails.מוצרים.map(item => ({
        Quantity: item.כמות,
        Price: item.מחיר_ליחידה,
        Name: item.שם_מוצר,
        Sku: item.מקט.toString(),
        vatType: 1
      }))
    };

     const response = await fetch('https://api.yeshinvoice.co.il/api/v1.1/createDocument', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': JSON.stringify({
           "secret": "094409be-bb9c-4a51-b3b5-2d15dc2d2154",
           "userkey": "CWKaRN8167zMA5niguEf"
         })
       },
       body: JSON.stringify(invoiceData)
     });

     if (!response.ok) {
       throw new Error('שגיאה ביצירת החשבונית');
     }

     const responseData = await response.json();
     console.log('תשובה מהשרת:', responseData);

     alert('ההזמנה נוצרה בהצלחה!');
     setOrders(products.map(p => ({ productId: p['מק"ט '], quantity: 0 })));
     setSelectedCustomer('');
     setCustomerSearch('');
     
   } catch (error) {
     console.error('שגיאה:', error);
     alert('אירעה שגיאה בשליחת ההזמנה. אנא נסה שנית.');
   }
 };

 const handleSubmit = (e) => {
   e.preventDefault();
   if (totalUnits < 60) {
     alert("נדרש מינימום של 60 יחידות להזמנה");
     return;
   }
   
   const orderSummary = orders
     .filter(order => order.quantity > 0)
     .map(order => {
       const product = products.find(p => p['מק"ט '] === order.productId);
       return {
         מקט: product['מק"ט '],
         שם_מוצר: product['שם מוצר'],
         כמות: order.quantity,
         מחיר_ליחידה: product['מחיר'],
         סהכ: order.quantity * product['מחיר']
       };
     });

   const orderDetails = {
     תאריך_הזמנה: new Date().toLocaleDateString('he-IL'),
     לקוח: selectedCustomer,
     מוצרים: orderSummary,
     סהכ_יחידות: totalUnits,
     סהכ_לתשלום: orderSummary.reduce((sum, item) => sum + item.סהכ, 0)
   };

   submitOrder(orderDetails);
 };

 if (loading) return (
   <div className="max-w-4xl mx-auto p-4 text-center">
     <Card className="p-8">
       <h2 className="text-xl">טוען מוצרים...</h2>
     </Card>
   </div>
 );

 if (error) return (
   <div className="max-w-4xl mx-auto p-4 text-center">
     <Card className="p-8">
       <h2 className="text-xl text-red-500">{error}</h2>
     </Card>
   </div>
 );

 return (
   <div className="max-w-4xl mx-auto p-4" dir="rtl">
     <Card className="bg-[#ecece3] shadow-sm">
       <CardContent className="p-6">
         <h1 className="text-2xl font-bold mb-6 text-center">טופס הזמנות</h1>
         
         <div className="relative mb-8">
           <CustomerSearch 
             onCustomerSelect={(customer) => {
               setSelectedCustomer(customer.name);
               setCustomerSearch(customer.name);
             }} 
           />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
           {products.map((product) => {
             const order = orders.find(o => o.productId === product['מק"ט ']) || { quantity: 0 };
             return (
               <Card key={product['מק"ט ']} className="bg-[#ecece3] shadow-sm">
                 <CardContent className="p-4">
                   <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                     <img
                       src={product['תמונה']}
                       alt={product['שם מוצר']}
                       className="w-full h-full object-contain rounded-lg"
                       onError={(e) => {
                         e.target.onerror = null;
                         e.target.style.display = 'none';
                         const parent = e.target.parentElement;
                         parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg></div>';
                       }}
                     />
                   </div>
                   
                   <div className="text-center space-y-3">
                     <h3 className="text-lg font-bold">
                       {product['שם מוצר']}
                     </h3>
                     
                     <div className="space-y-1">
                       <p className="text-gray-600 text-sm">
                         {product['כפולות להזמנה']} יח׳ בארגז
                       </p>
                       <p className="text-base font-medium">
                         {product['מחיר']} ₪ ליחידה
                       </p>
                     </div>

                     <div className="space-y-2">
                       <Label className="text-sm">
                         כמות (כפולות של {product['כפולות להזמנה']})
                       </Label>
                       <div className="flex items-center justify-between w-full max-w-[200px] mx-auto">
                         <Button
                           type="button"
                           variant="outline"
                           size="icon"
                           onClick={() => adjustQuantity(product['מק"ט '], 1)}
                           className="h-10 w-10 flex-shrink-0 bg-blue-50 hover:bg-blue-100"
                         >
                           <Plus className="h-5 w-5" />
                         </Button>
                         
                         <Input
                           type="number"
                           value={order.quantity}
                           onChange={(e) => handleQuantityChange(product['מק"ט '], Number(e.target.value))}
                           className="text-center mx-2 w-24"
                           min="0"
                           step={product['כפולות להזמנה']}
                         />
                         
                         <Button
                           type="button"
                           variant="outline"
                           size="icon"
                           onClick={() => adjustQuantity(product['מק"ט '], -1)}
                           disabled={order.quantity === 0}
                           className="h-10 w-10 flex-shrink-0 bg-blue-50 hover:bg-blue-100"
                         >
                           <Minus className="h-5 w-5" />
                         </Button>
                       </div>
                     </div>
                     
                     {order.quantity > 0 && (
                       <p className="text-base font-medium">
                         סה"כ: {(order.quantity * product['מחיר']).toFixed(2)} ₪
                       </p>
                     )}
                   </div>
                 </CardContent>
               </Card>
             );
           })}
         </div>

         <div className="text-center space-y-4 mb-6">
           <p className="text-xl font-bold">
             סה"כ יחידות: {totalUnits}
           </p>
           {orders.some(o => o.quantity > 0) && (
             <p className="text-xl font-bold">
               סה"כ לתשלום (לא כולל מע"מ) : ₪
               {orders.reduce((sum, order) => {
                 const product = products.find(p => p['מק"ט '] === order.productId);
                 return sum + (order.quantity * product['מחיר']);
               }, 0).toFixed(2)}
             </p>
           )}
           {totalUnits < 60 && (
             <p className="text-red-500">
               נדרש מינימום של 60 יחידות להזמנה
             </p>
           )}
         </div>

         <Button 
           onClick={handleSubmit}
           className="w-full"
           disabled={totalUnits < 60 || !selectedCustomer}
         >
           שלח הזמנה
         </Button>
       </CardContent>
     </Card>
   </div>
 );
};

export default OrderForm;

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CustomerSearch = ({ onCustomerSelect }) => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCustomers = async (search = '') => {
    setIsLoading(true);
    try {
      const response = await fetch('https://api.yeshinvoice.co.il/api/v1/getAllCustomers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': JSON.stringify({
            "secret": "094409be-bb9c-4a51-b3b5-2d15dc2d2154",
            "userkey": "CWKaRN8167zMA5niguEf"
          })
        },
        body: JSON.stringify({
          PageSize: 20,
          PageNumber: 1,
          Search: search,
          PortfolioID: 0,
          orderby: {
            column: "Name",
            asc: "asc"
          }
        })
      });
      
      const data = await response.json();
      if (data.Success) {
        setCustomers(data.ReturnValue);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (searchTerm.length >= 2) {
      const timeoutId = setTimeout(() => {
        fetchCustomers(searchTerm);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setCustomers([]);
    }
  }, [searchTerm]);

  return (
    <div className="relative">
      <Label className="block mb-2">בחר לקוח</Label>
      <div className="relative">
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onClick={() => setIsOpen(true)}
          placeholder="הקלד לחיפוש לקוח..."
          className="w-full"
        />
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
      </div>

      {isOpen && (customers.length > 0 || isLoading) && (
        <div className="absolute z-10 w-full bg-white border rounded-md mt-1 max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">טוען...</div>
          ) : (
            <div>
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    onCustomerSelect(customer);
                    setSearchTerm(customer.name);
                    setIsOpen(false);
                  }}
                >
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-sm text-gray-500">
                    {customer.phone} | {customer.email}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSearch;
import React, { useState, useEffect, useMemo } from 'react';
import { ComponentParams, ComponentRendering } from '@sitecore-jss/sitecore-jss-nextjs';
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

interface BookingServiceProps {
  rendering: ComponentRendering & { params: ComponentParams };
  params: ComponentParams;
}

interface Field<T> {
  value: T;
}

interface Item {
  id: string;
  url: string;
  name: string;
  displayName: string;
  fields: {
    Country?: Field<string>;
    City?: { fields: { City: Field<string> } }[]; // City is an array of objects, each having a fields.City.value
  };
}

interface FormData {
  personalInfo: {
    familyName: string;
    firstName: string;
    mobile: string;
    email: string;
    country: string;
    city: string;
  };
  vehicleInfo: {
    model: string;
    carType: string;
    plateNumber: string;
    meterReading: string;
  };
  bookingDetails: {
    reminders: boolean;
  };
  termsConditions: {
    agreed: boolean;
    contactMethods: {
      whatsapp: boolean;
      sms: boolean;
      call: boolean;
      selectAll: boolean; // New field for Select All checkbox
    };
  };
}

// Define the keys as a type, so TypeScript knows the valid keys
type AccordionSection = 'personalInfo' | 'vehicleInfo' | 'bookingDetails' | 'termsConditions';

const Default = (props: BookingServiceProps): JSX.Element => {
  const heading =
    (props.rendering.fields?.Heading as Field<string>)?.value || 'Booking Appointment';

  const apolloClient = new ApolloClient({
    uri: 'https://xmc-epamemeatra606b-headlesssxa5d02-dev887b.sitecorecloud.io/sitecore/api/graph/edge',
    headers: {
      sc_apikey: '4186D193-091A-4F21-9DC2-E8B19EFEF40F',
    },
    cache: new InMemoryCache(),
  });

  const query = gql`
    query GetCountries {
      item(path: "/sitecore/content/company/company-dev/Data/Location", language: "en") {
        children {
          results {
            name
            id
            children {
              results {
                name
                id
                children {
                  results {
                    name
                    id
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  apolloClient
    .query({
      query: query,
    })
    .then(
      (data) => {
        console.log('The request was successfull, here is the data', data);
      },
      (error) => {
        console.log('The request failed, here is the error', error);
      }
    );

  // Use memo to optimize the countries array
  const countries = useMemo(
    () =>
      Array.isArray(props.rendering.fields?.Country)
        ? (props.rendering.fields.Country as Item[])
        : [],
    [props.rendering.fields?.Country]
  );

  // State for form data
  const [formData, setFormData] = useState<FormData>({
    personalInfo: {
      familyName: '',
      firstName: '',
      mobile: '',
      email: '',
      country: '',
      city: '',
    },
    vehicleInfo: {
      model: '',
      carType: '',
      plateNumber: '',
      meterReading: '',
    },
    bookingDetails: {
      reminders: false,
    },
    termsConditions: {
      agreed: false,
      contactMethods: {
        whatsapp: false,
        sms: false,
        call: false,
        selectAll: false, // Initial state for Select All checkbox
      },
    },
  });

  // State for accordion visibility
  const [accordionState, setAccordionState] = useState<Record<AccordionSection, boolean>>({
    personalInfo: false,
    vehicleInfo: false,
    bookingDetails: false,
    termsConditions: false,
  });

  // Cascading cities based on selected country
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  useEffect(() => {
    const selectedCountry = formData.personalInfo.country;
    const countryItem = countries.find(
      (country) => country.fields?.Country?.value === selectedCountry
    );
    if (countryItem && countryItem.fields?.City) {
      setFilteredCities(countryItem.fields.City.map((cityObj) => cityObj.fields.City.value));
    } else {
      setFilteredCities([]);
    }
  }, [formData.personalInfo.country, countries]);

  // Handle form input changes
  const handleChange = (section: keyof FormData, field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  // Handle individual checkbox change
  const handleCheckboxChange = (checkboxName: string, value: boolean) => {
    setFormData((prev) => {
      const newContactMethods = { ...prev.termsConditions.contactMethods, [checkboxName]: value };
      const allChecked = Object.values(newContactMethods).every((val) => val); // If all checkboxes are true
      return {
        ...prev,
        termsConditions: {
          ...prev.termsConditions,
          contactMethods: newContactMethods,
          selectAll: allChecked, // Update "Select All" checkbox based on individual selections
        },
      };
    });
  };

  // Handle Select All checkbox change
  const handleSelectAllChange = (value: boolean) => {
    setFormData((prev) => {
      const newContactMethods = {
        whatsapp: value,
        sms: value,
        call: value,
        selectAll: value,
      };
      return {
        ...prev,
        termsConditions: {
          ...prev.termsConditions,
          contactMethods: newContactMethods,
        },
      };
    });
  };

  // Manual validation function
  const validateForm = (): boolean => {
    const { personalInfo, vehicleInfo, bookingDetails, termsConditions } = formData;
    const personalInfoValid = Object.values(personalInfo).every((val) => val.trim() !== '');
    const vehicleInfoValid = Object.values(vehicleInfo).every((val) => val.trim() !== '');
    const bookingDetailsValid = bookingDetails.reminders;
    const termsConditionsValid =
      termsConditions.agreed && Object.values(termsConditions.contactMethods).includes(true);

    return personalInfoValid && vehicleInfoValid && bookingDetailsValid && termsConditionsValid;
  };

  // Form submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Form submitted successfully', formData);
    } else {
      console.log('Form validation failed');
    }
  };

  // Toggle accordion visibility
  const toggleAccordion = (section: AccordionSection) => {
    setAccordionState((prevState) => ({
      ...prevState,
      [section]: !prevState[section], // TypeScript now knows section is a valid key
    }));
  };

  return (
    <div className="form-container">
      <h1>{heading}</h1>

      <form onSubmit={handleSubmit}>
        {/* Personal Information Accordion */}
        <div className="accordion">
          <button type="button" onClick={() => toggleAccordion('personalInfo')}>
            Personal Information
          </button>
          {accordionState.personalInfo && (
            <div className="accordion-content">
              <div className="form-section">
                <label htmlFor="familyName">Family Name</label>
                <input
                  type="text"
                  id="familyName"
                  placeholder="Family Name"
                  value={formData.personalInfo.familyName}
                  onChange={(e) => handleChange('personalInfo', 'familyName', e.target.value)}
                />
              </div>
              <div className="form-section">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  placeholder="First Name"
                  value={formData.personalInfo.firstName}
                  onChange={(e) => handleChange('personalInfo', 'firstName', e.target.value)}
                />
              </div>
              <div className="form-section">
                <label htmlFor="mobile">Mobile</label>
                <input
                  type="text"
                  id="mobile"
                  placeholder="Mobile"
                  value={formData.personalInfo.mobile}
                  onChange={(e) => handleChange('personalInfo', 'mobile', e.target.value)}
                />
              </div>
              <div className="form-section">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  placeholder="Email"
                  value={formData.personalInfo.email}
                  onChange={(e) => handleChange('personalInfo', 'email', e.target.value)}
                />
              </div>
              <div className="form-section">
                <label htmlFor="country">Country</label>
                <select
                  id="country"
                  value={formData.personalInfo.country}
                  onChange={(e) => handleChange('personalInfo', 'country', e.target.value)}
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.fields.Country?.value}>
                      {country.fields.Country?.value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-section">
                <label htmlFor="city">City</label>
                <select
                  id="city"
                  value={formData.personalInfo.city}
                  onChange={(e) => handleChange('personalInfo', 'city', e.target.value)}
                >
                  <option value="">Select City</option>
                  {filteredCities.map((city, index) => (
                    <option key={index} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Vehicle Information Accordion */}
        <div className="accordion">
          <button type="button" onClick={() => toggleAccordion('vehicleInfo')}>
            Vehicle Information
          </button>
          {accordionState.vehicleInfo && (
            <div className="accordion-content">
              <div className="form-section">
                <label htmlFor="model">Model</label>
                <input
                  type="text"
                  id="model"
                  placeholder="Model"
                  value={formData.vehicleInfo.model}
                  onChange={(e) => handleChange('vehicleInfo', 'model', e.target.value)}
                />
              </div>
              <div className="form-section">
                <label htmlFor="carType">Car Type</label>
                <input
                  type="text"
                  id="carType"
                  placeholder="Car Type"
                  value={formData.vehicleInfo.carType}
                  onChange={(e) => handleChange('vehicleInfo', 'carType', e.target.value)}
                />
              </div>
              <div className="form-section">
                <label htmlFor="plateNumber">Plate Number</label>
                <input
                  type="text"
                  id="plateNumber"
                  placeholder="Plate Number"
                  value={formData.vehicleInfo.plateNumber}
                  onChange={(e) => handleChange('vehicleInfo', 'plateNumber', e.target.value)}
                />
              </div>
              <div className="form-section">
                <label htmlFor="meterReading">Meter Reading</label>
                <input
                  type="text"
                  id="meterReading"
                  placeholder="Meter Reading"
                  value={formData.vehicleInfo.meterReading}
                  onChange={(e) => handleChange('vehicleInfo', 'meterReading', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Booking Details Accordion */}
        <div className="accordion">
          <button type="button" onClick={() => toggleAccordion('bookingDetails')}>
            Booking Details
          </button>
          {accordionState.bookingDetails && (
            <div className="accordion-content">
              <div className="form-section">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.bookingDetails.reminders}
                    onChange={(e) => handleChange('bookingDetails', 'reminders', e.target.checked)}
                  />
                  Send Reminders
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Terms and Conditions Accordion */}
        <div className="accordion">
          <button type="button" onClick={() => toggleAccordion('termsConditions')}>
            Terms and Conditions
          </button>
          {accordionState.termsConditions && (
            <div className="accordion-content">
              <div className="checkbox-group">
                <label className="select-all">
                  <input
                    type="checkbox"
                    checked={formData.termsConditions.contactMethods.selectAll}
                    onChange={(e) => handleSelectAllChange(e.target.checked)}
                  />
                  Select All
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={formData.termsConditions.contactMethods.whatsapp}
                    onChange={(e) => handleCheckboxChange('whatsapp', e.target.checked)}
                  />
                  WhatsApp
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.termsConditions.contactMethods.sms}
                    onChange={(e) => handleCheckboxChange('sms', e.target.checked)}
                  />
                  SMS
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.termsConditions.contactMethods.call}
                    onChange={(e) => handleCheckboxChange('call', e.target.checked)}
                  />
                  Call
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="form-section">
          <button type="submit">Book Appointment</button>
        </div>
      </form>
    </div>
  );
};

export default Default;

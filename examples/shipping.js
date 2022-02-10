/* eslint-disable  no-alert, no-unused-vars */

const order = {
  purchase_units: [
    {
      payee: {
        merchant_id: "XWVWZ4HG4YH9N",
      },
      amount: {
        currency_code: "USD",
        value: "7.05",
        breakdown: {
          item_total: {
            currency_code: "USD",
            value: "1.99",
          },
          tax_total: {
            currency_code: "USD",
            value: "0.07",
          },
          shipping: {
            currency_code: "USD",
            value: "4.99",
          },
        },
      },
      shipping: {
        address: {
          shipping_name: "John Doe",
          phone: "5109323432",
          address_line_1: "123 Townsend St",
          address_line_2: "Floor 6",
          admin_area_1: "CA",
          admin_area_2: "San Francisco",
          postal_code: "94107",
          country_code: "US",
          address_details: {},
        },
        method: "USPS",
        options: [
          {
            id: "1",
            amount: {
              currency_code: "USD",
              value: "4.99",
            },
            type: "SHIPPING",
            label: "🚛 Ground Shipping (2 days)",
            selected: true,
          },
          {
            id: "2",
            amount: {
              currency_code: "USD",
              value: "24.99",
            },
            type: "SHIPPING",
            label: "🚀 Drone Express (2 hours)",
            selected: false,
          },
        ],
      },
    },
  ],
};

paypal
  .Buttons({
    fundingSource: paypal.FUNDING.APPLEPAY,
    style: {
      label: "pay",
      color: "black",
    },
    createOrder(data, actions) {
      return actions.order.create(order);
    },
    onApprove(data, actions) {
      console.log("Order approved");

      fetch(`/capture/${data.orderID}`, {
        method: "post",
      })
        .then((res) => res.json())
        .then((data) => {
          alert("order captured");
        })
        .catch(console.error);
    },
    onShippingChange(data, actions) {
      console.log("onShippingChange");
      console.log(JSON.stringify(data, null, 4));

      const { orderID, selected_shipping_option, shipping_address } = data;

      /*
       * Handle Shipping Address Changes - example shipping to us only
   
      if (data.shipping_address?.country_code !== "us") {
        // https://developer.apple.com/documentation/apple_pay_on_the_web/applepayerrorcode
        // https://developer.apple.com/documentation/apple_pay_on_the_web/applepayerror
        return actions.reject(
          new window.ApplePayError(
            "shippingContactInvalid",
            "countryCode",
            "Sorry we only ship to the US"
          )
        );
      }
    */
      /*
       * Handle Shipping Option Update
       */
      const {
        breakdown,
      } = order.purchase_units[0].amount;

      const itemTotal = parseFloat(breakdown.item_total.value, 10);
      const taxAmount = parseFloat(breakdown.tax_total.value, 10);

      const defaultShipping =
        order.purchase_units[0].shipping.options.find(
          (option) => option.selected
        );

      let shippingMethodAmount = parseFloat(defaultShipping.amount.value, 10);

      if (selected_shipping_option?.amount?.value) {
        shippingMethodAmount = parseFloat(
          selected_shipping_option.amount.value,
          10
        );

        data.selected_shipping_option.selected = true;
      }

      data.amount.value = (
        itemTotal +
        taxAmount +
        shippingMethodAmount
      ).toFixed(2);

      return fetch(`/orders/${orderID}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            op: "replace",
            path: "/purchase_units/@reference_id=='default'/amount",
            value: data.amount,
          },
        ]),
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error("patching order");
          }
          return res.json();
        })
        .then((json) => {
          console.log(`Successful Order patch call: ${JSON.stringify(json)}`);
          return actions.resolve();
        })
        .catch((err) => {
          return actions.reject(err);
        });
    },
  })
  .render("#applepay-btn");

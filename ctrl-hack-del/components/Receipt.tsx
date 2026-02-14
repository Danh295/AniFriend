"use client";

interface ReceiptItem {
  name: string;
  price: number;
}

interface ReceiptProps {
  modelName: string;
  timestamp: Date;
  items: ReceiptItem[];
  onPay: () => void;
}

export default function Receipt({ modelName, timestamp, items, onPay }: ReceiptProps) {

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const serviceCharge = subtotal * 0.10; // 10% service charge
  const gst = (subtotal + serviceCharge) * 0.09; // 9% GST
  const pst = (subtotal + serviceCharge) * 0.07; // 7% PST
  const total = subtotal + serviceCharge + gst + pst;

  const handlePay = () => {
    onPay();
  };

  return (
    <div className="receipt-overlay">
      <div className="receipt-container">
        <div className="receipt-header">
          <h2 className="receipt-title">Café Receipt</h2>
          <p className="receipt-subtitle">Thank you for your visit!</p>
          <div className="receipt-divider" />
        </div>

        <div className="receipt-details">
          <div className="receipt-info">
            <span>Date:</span>
            <span>{timestamp.toLocaleDateString()}</span>
          </div>
          <div className="receipt-info">
            <span>Time:</span>
            <span>{timestamp.toLocaleTimeString()}</span>
          </div>
          <div className="receipt-info">
            <span># of Guests:</span>
            <span>2</span>
          </div>
        </div>

        <div className="receipt-divider" />

        <div className="receipt-items">
          {items.map((item, index) => (
            <div key={index} className="receipt-item">
              <span className="item-name">{item.name}</span>
              <span className="item-price">${item.price.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="receipt-divider" />

        <div className="receipt-totals">
          <div className="receipt-line">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="receipt-line">
            <span>Service Charge (10%):</span>
            <span>${serviceCharge.toFixed(2)}</span>
          </div>
          <div className="receipt-line">
            <span>GST (9%):</span>
            <span>${gst.toFixed(2)}</span>
          </div>
          <div className="receipt-line">
            <span>PST (7%):</span>
            <span>${pst.toFixed(2)}</span>
          </div>
          <div className="receipt-divider-thick" />
          <div className="receipt-line receipt-total">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <button className="receipt-pay-btn" onClick={handlePay}>
          Pay & Return Home
        </button>

        <p className="receipt-footer">
          We hope you enjoyed your time together! ♥
        </p>
      </div>
    </div>
  );
}

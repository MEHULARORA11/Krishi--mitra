const Footer = () => {
  const footerColumns = [
    {
      title: "Krishi AI",
      content:
        "Government of India's initiative for agricultural development and farmer welfare.",
      isText: true,
    },
    {
      title: "Quick Links",
      links: [
        "Farmer Registration",
        "Crop Calendar",
        "Weather Advisory",
        "Soil Health Card",
      ],
    },
    {
      title: "Schemes",
      links: [
        "Subsidy Programs",
        "Crop Insurance",
        "Loan Facilities",
        "Training Programs",
      ],
    },
    {
      title: "Contact Us",
      contacts: [
        { icon: "fas fa-phone", text: "0471-1234567" },
        { icon: "fas fa-envelope", text: "support@krishiIndia.org" },
        {
          icon: "fas fa-map-marker-alt",
          text: "Agriculture Directorate, Thiruvananthapuram",
        },
      ],
    },
  ];

  return (
    <footer>
      <div className="container">
        <div className="footer-content">
          {footerColumns.map((column, index) => (
            <div key={index} className="footer-column">
              <h3>{column.title}</h3>

              {column.isText && <p>{column.content}</p>}

              {column.links && (
                <ul>
                  {column.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a href="#">{link}</a>
                    </li>
                  ))}
                </ul>
              )}

              {column.contacts && (
                <ul>
                  {column.contacts.map((contact, contactIndex) => (
                    <li key={contactIndex}>
                      <i className={contact.icon}></i> {contact.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="copyright">
          <p>
            &copy; 2025 Government of India, Department of Agriculture. All
            rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

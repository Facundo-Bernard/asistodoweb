import React from "react";

const Highlights = () => {
  return (
    <div className="container my-5">
      <div
        className="p-4 rounded shadow"
        style={{ backgroundColor: "#fff", border: "1px solid #e0e0e0" }}
      >
        <div className="row text-center">
          {/* Tarjeta 1 */}
          <div className="col-12 col-md-6 mb-4 mb-md-0">
            <div className="p-4 border rounded h-100 bg-light">
              <h2 className="text-primary fw-bold">10.500+</h2>
              <p className="mb-0">Clientes satisfechos</p>
            </div>
          </div>

          {/* Tarjeta 2 */}
          <div className="col-12 col-md-6">
            <div className="p-4 border rounded h-100 bg-light">
              <h2 className="text-success fw-bold">+10 años</h2>
              <p className="mb-0">de experiencia en el mercado</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Highlights;
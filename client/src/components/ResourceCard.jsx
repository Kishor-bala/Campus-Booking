import React from 'react';
import { Link } from 'react-router-dom';

export const ResourceCard = ({ resource }) => {
  return (
    <div className="resource-card">
      <div className="card-header">
        <span className="category-badge">{resource.category}</span>
        <span className="capacity-badge">👥 Capacity: {resource.capacity}</span>
      </div>
      <h3 className="resource-title">{resource.name}</h3>
      <p className="resource-location">📍 {resource.location}</p>
      <p className="resource-desc">{resource.description}</p>
      <div className="card-footer">
        <Link to={`/resources/${resource.id}`} className="btn-view-slots">
          View Availability & Slots &rarr;
        </Link>
      </div>
    </div>
  );
};

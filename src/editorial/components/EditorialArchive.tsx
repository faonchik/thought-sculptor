import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { getHallSpecimens, type HallSpecimen } from '../../services/hallStorage';
import { SpecimenThumbnail } from '../../components/SpecimenThumbnail';

interface EditorialArchiveProps {
  onInspectSpecimen: (specimen: HallSpecimen) => void;
  onClose: () => void;
}

export const EditorialArchive: React.FC<EditorialArchiveProps> = ({
  onInspectSpecimen,
}) => {
  const [specimens, setSpecimens] = useState<HallSpecimen[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    setSpecimens(getHallSpecimens());
  }, []);

  const filtered = specimens.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
    const matchesFilter = filterType === 'all' || s.material === filterType || (filterType === 'couples' && s.isCouples);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="editorial-archive-view" role="region" aria-label="Архив монолитов">
      {/* Archive Header */}
      <div className="ed-archive-headline-row">
        <div>
          <h2 className="ed-archive-title">Archive of Acoustic Monoliths</h2>
          <p style={{ fontSize: '11px', color: 'var(--ed-ink-muted)', marginTop: '4px' }}>
            Permanent scientific collection of crystallized voice topologies and parametric artefacts.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid var(--ed-line)', padding: '2px 6px' }}>
            <Search size={12} color="var(--ed-ink-muted)" />
            <input
              type="text"
              placeholder="Search accession..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontFamily: 'var(--ed-font-mono)',
                fontSize: '10.5px',
                color: 'var(--ed-ink)',
                outline: 'none',
                width: '130px',
              }}
            />
          </div>
          <div className="ed-archive-stats">
            <span>Total: {specimens.length}</span>
            <span style={{ margin: '0 8px' }}>•</span>
            <span>1000+ Years</span>
          </div>
        </div>
      </div>


      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[
          { id: 'all', label: `All Specimen Plates (${specimens.length})` },
          { id: 'couples', label: 'Duet Unions [Для пар]' },
          { id: 'basalt', label: 'Carrara Marble' },
          { id: 'graphite', label: 'Patinated Bronze' },
          { id: 'ceramic', label: 'Baked Terracotta' },
          { id: 'obsidian', label: 'Polished Onyx' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            className="ed-btn-outline"
            style={{
              height: '28px',
              padding: '0 10px',
              fontSize: '9.5px',
              backgroundColor: filterType === f.id ? 'var(--ed-ink)' : 'transparent',
              color: filterType === f.id ? 'var(--ed-bg-pure)' : 'var(--ed-ink)',
            }}
            onClick={() => setFilterType(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Specimen Plates Grid */}
      <div className="ed-specimens-grid">
        {filtered.map((specimen) => (
          <article key={specimen.id} className="ed-specimen-plate">
            {/* Plate Header */}
            <div className="ed-plate-top-bar">
              <span>№ {specimen.id}</span>
              <span>{specimen.isCouples ? 'DUET UNION' : 'MONOLITH'}</span>
            </div>

            {/* 3D Preview Stage */}
            <div className="ed-plate-stage">
              <SpecimenThumbnail specimen={specimen} />
            </div>

            {/* Plate Body */}
            <div className="ed-plate-body">
              <h3 className="ed-plate-name">{specimen.name}</h3>
              <p className="ed-plate-thesis">{specimen.property || specimen.poeticDescription}</p>

              <div className="ed-plate-specs">
                <span>F0: {specimen.avgPitch ? `${Math.round(specimen.avgPitch)} Hz` : '175 Hz'}</span>
                <span>Mat: {specimen.material}</span>
                <span>{specimen.authorName}</span>
              </div>

              <button
                type="button"
                className="ed-plate-inspect-btn"
                onClick={() => onInspectSpecimen(specimen)}
                title="Осмотреть монолит в 3D"
              >
                Inspect Specimen in 3D ↗
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

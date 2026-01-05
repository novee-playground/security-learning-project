/**
 * 検索コンポーネント
 * 
 * 警告: このコードには意図的にセキュリティ脆弱性が含まれています。
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { searchAPI } from '../services/api';

function Search() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // ===== 脆弱性: SQLインジェクション可能 =====
            const data = await searchAPI.search(query);
            setResults(data);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <div className="card">
                <h1>検索</h1>
                <form onSubmit={handleSearch}>
                    <div className="form-group">
                        <input
                            type="text"
                            placeholder="検索キーワードを入力..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? '検索中...' : '検索'}
                    </button>
                </form>
            </div>

            {results.length > 0 && (
                <div className="card">
                    <h2>検索結果 ({results.length}件)</h2>
                    {results.map(result => (
                        <div key={result.id} className="search-result">
                            <Link to={`/post/${result.id}`}>
                                <h3>{result.title}</h3>
                            </Link>
                            <div dangerouslySetInnerHTML={{ __html: result.content }} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Search;

// Made with Bob
import { RestApiHelper, RestApiError } from './helper'
import 'jest-fetch-mock'

// tslint:disable-next-line no-var-requires
(global as any).fetch = require('jest-fetch-mock')

beforeEach(() => {
  fetch.resetMocks()
})

describe('model.mixins.rest api helper', () => {
  describe('url', () => {
    test('default baseURL is empty string', async () => {
      const api = new RestApiHelper({})
      const { mock } = fetch.mockResponseOnce(JSON.stringify({ foo: 'bar' })) as any
      await api.get()
      expect(mock.calls[0][0]).toBe('')
    })

    test('defaults to baseURL if no args', async () => {
      const api = new RestApiHelper({ baseURL: '/foo' })
      const { mock } = fetch.mockResponseOnce(JSON.stringify({ foo: 'bar' })) as any
      await api.get()
      expect(mock.calls[0][0]).toBe('/foo')
    })

    test('defaults to baseURL if only options', async () => {
      const api = new RestApiHelper({ baseURL: '/foo' })
      const { mock } = fetch.mockResponseOnce(JSON.stringify({ foo: 'bar' })) as any
      await api.get({})
      expect(mock.calls[0][0]).toBe('/foo')
    })

    test('uses baseURL + endpoint if supplied', async () => {
      const api = new RestApiHelper({ baseURL: '/foo' })
      const { mock } = fetch.mockResponseOnce(JSON.stringify({ foo: 'bar' })) as any
      await api.get('/bar')
      expect(mock.calls[0][0]).toBe('/foo/bar')
    })
  })

  describe('query', () => {
    test('defaults to simple bracket notation querystring', async () => {
      const api = new RestApiHelper({})
      const { mock } = fetch.mockResponseOnce(JSON.stringify({ foo: 'bar' })) as any
      await api.get({
        params: {
          foo: 'foo',
          bar: [
            'bar1',
            'bar2'
          ]
        }
      })
      expect(mock.calls[0][0]).toBe('?foo=foo&bar[]=bar1&bar[]=bar2')
    })

    test('query stringifier is configurable', async () => {
      const api = new RestApiHelper({
        stringifyQuery: (q) => JSON.stringify(q)
      })
      const { mock } = fetch.mockResponseOnce(JSON.stringify({ foo: 'bar' })) as any
      const params = {
        foo: 'foo',
        bar: [
          'bar1',
          'bar2'
        ]
      }
      await api.get({ params })
      expect(mock.calls[0][0]).toBe('?' + JSON.stringify(params))
    })
  })

  describe('headers', () => {
    test('adds content-type application/json header', async () => {
      const api = new RestApiHelper({})
      const { mock } = fetch.mockResponseOnce(JSON.stringify({ foo: 'bar' })) as any
      await api.get()
      expect(mock.calls[0][1].headers['Content-Type']).toBe('application/json')
    })

    test('headers are configurable', async () => {
      const api = new RestApiHelper({
        headers: {
          'X-Test': 'foobar'
        }
      })
      const { mock } = fetch.mockResponseOnce(JSON.stringify({ foo: 'bar' })) as any
      await api.get()
      expect(mock.calls[0][1].headers['Content-Type']).toBe('application/json')
      expect(mock.calls[0][1].headers['X-Test']).toBe('foobar')
    })
  })

  describe('authentication', () => {
    test('mode is unset when cors option is false', async () => {
      const api = new RestApiHelper({})
      const { mock } = fetch.mockResponseOnce(JSON.stringify({ foo: 'bar' })) as any
      await api.get()
      expect(mock.calls[0][1].mode).toBeUndefined()
    })

    test('mode is cors when cors option is true', async () => {
      const api = new RestApiHelper({
        cors: true
      })
      const { mock } = fetch.mockResponseOnce(JSON.stringify({ foo: 'bar' })) as any
      await api.get()
      expect(mock.calls[0][1].mode).toBe('cors')
    })

    test('credentials is include when cors and authenticated options', async () => {
      const api = new RestApiHelper({
        cors: true,
        authenticated: true
      })
      const { mock } = fetch.mockResponseOnce(JSON.stringify({ foo: 'bar' })) as any
      await api.get()
      expect(mock.calls[0][1].credentials).toBe('include')
    })

    test('credentials is same-origin when authenticated and not cors', async () => {
      const api = new RestApiHelper({
        authenticated: true
      })
      const { mock } = fetch.mockResponseOnce(JSON.stringify({ foo: 'bar' })) as any
      await api.get()
      expect(mock.calls[0][1].credentials).toBe('same-origin')
    })

    test('credentials is unset when not authenticated (even if cors)', async () => {
      const corsApi = new RestApiHelper({ cors: true })
      const nonCorsApi = new RestApiHelper({})
      const { mock } = fetch.mockResponse(JSON.stringify({ foo: 'bar' })) as any
      await corsApi.get()
      await nonCorsApi.get()
      expect(mock.calls[0][1].credentials).toBeUndefined()
      expect(mock.calls[1][1].credentials).toBeUndefined()
    })
  })

  describe('constants', () => {
    test('sets cache no-cache', async () => {
      const api = new RestApiHelper({})
      const { mock } = fetch.mockResponseOnce(JSON.stringify({ foo: 'bar' })) as any
      await api.get()
      expect(mock.calls[0][1].cache).toBe('no-cache')
    })

    test('sets redirect follow', async () => {
      const api = new RestApiHelper({})
      const { mock } = fetch.mockResponseOnce(JSON.stringify({ foo: 'bar' })) as any
      await api.get()
      expect(mock.calls[0][1].redirect).toBe('follow')
    })
  })

  describe('helper methods', () => {
    test('return parsed response', async () => {
      const api = new RestApiHelper({})
      const { mock } = fetch.mockResponseOnce(JSON.stringify({ foo: 'bar' })) as any
      const res = await api.get()
      expect(res).toEqual({ foo: 'bar' })
    })

    test('uses the correct HTTP method', async () => {
      const api = new RestApiHelper({})
      const { mock } = fetch.mockResponse(JSON.stringify({ foo: 'bar' })) as any

      await api.get()
      await api.post()
      await api.put()
      await api.patch()
      await api.delete()

      expect(mock.calls[0][1].method).toBe('GET')
      expect(mock.calls[1][1].method).toBe('POST')
      expect(mock.calls[2][1].method).toBe('PUT')
      expect(mock.calls[3][1].method).toBe('PATCH')
      expect(mock.calls[4][1].method).toBe('DELETE')
    })

    test('post, put, patch, and delete support data as first arg', async () => {
      const api = new RestApiHelper({})
      const { mock } = fetch.mockResponse(JSON.stringify({ foo: 'bar' })) as any
      const data = { baz: 'qux' }
      const jsonData = JSON.stringify(data)

      await api.post({ data })
      await api.put({ data })
      await api.patch({ data })
      await api.delete({ data })

      expect(mock.calls[0][1].body).toBe(jsonData)
      expect(mock.calls[1][1].body).toBe(jsonData)
      expect(mock.calls[2][1].body).toBe(jsonData)
      expect(mock.calls[3][1].body).toBe(jsonData)
    })

    test('post, put, patch, and delete support data as second arg', async () => {
      const api = new RestApiHelper({})
      const { mock } = fetch.mockResponse(JSON.stringify({ foo: 'bar' })) as any
      const data = { baz: 'qux' }
      const jsonData = JSON.stringify(data)

      await api.post('/', { data })
      await api.put('/', { data })
      await api.patch('/', { data })
      await api.delete('/', { data })

      expect(mock.calls[0][1].body).toBe(jsonData)
      expect(mock.calls[1][1].body).toBe(jsonData)
      expect(mock.calls[2][1].body).toBe(jsonData)
      expect(mock.calls[3][1].body).toBe(jsonData)
    })

    test('post, put, patch, and delete don\'t blow up if no data', async () => {
      const api = new RestApiHelper({})
      const { mock } = fetch.mockResponse(JSON.stringify({ foo: 'bar' })) as any

      await api.post()
      await api.put()
      await api.patch()
      await api.delete()

      expect(mock.calls[0][1].body).toBeUndefined()
      expect(mock.calls[1][1].body).toBeUndefined()
      expect(mock.calls[2][1].body).toBeUndefined()
      expect(mock.calls[3][1].body).toBeUndefined()
    })

    test('rejects if status < 200', async () => {
      const api = new RestApiHelper({})
      const { mock } = fetch.mockResponse('', { status: 199 }) as any
      await expect(api.get()).rejects.toBeInstanceOf(RestApiError)
    })

    test('rejects if status >= 300', async () => {
      const api = new RestApiHelper({})
      const { mock } = fetch.mockResponse('', { status: 301 }) as any
      await expect(api.get()).rejects.toBeInstanceOf(RestApiError)
    })
  })
})
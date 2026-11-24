--
-- PostgreSQL database dump
--

\restrict yiOBfEUcUVIxtwVGiVNSNtV0skI2YSO0I4ZGkcE5WXfM8aqFoPcj0bVWSggi13M

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: m_dokter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m_dokter (
    id integer NOT NULL,
    kode character varying(30) NOT NULL,
    nama character varying(100) NOT NULL,
    sip character varying(50) NOT NULL,
    spesialis character varying(100),
    jenis_tenaga character varying(20) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    deleted_at timestamp(0) without time zone,
    CONSTRAINT chk_m_dokter_jenis_tenaga CHECK (((jenis_tenaga)::text = ANY ((ARRAY['dokter'::character varying, 'perawat'::character varying, 'analis'::character varying, 'apoteker'::character varying])::text[])))
);


--
-- Name: m_dokter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m_dokter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m_dokter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m_dokter_id_seq OWNED BY public.m_dokter.id;


--
-- Name: m_icd10; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m_icd10 (
    id integer NOT NULL,
    kode character varying(20) NOT NULL,
    nama character varying(200) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    deleted_at timestamp(0) without time zone
);


--
-- Name: m_icd10_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m_icd10_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m_icd10_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m_icd10_id_seq OWNED BY public.m_icd10.id;


--
-- Name: m_jadwal_dokter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m_jadwal_dokter (
    id integer NOT NULL,
    dokter_id integer NOT NULL,
    poli_id integer NOT NULL,
    hari smallint NOT NULL,
    jam_mulai character varying(5) NOT NULL,
    jam_selesai character varying(5) NOT NULL,
    kuota integer DEFAULT 20 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    deleted_at timestamp(0) without time zone,
    CONSTRAINT chk_m_jadwal_dokter_hari CHECK (((hari >= 1) AND (hari <= 7))),
    CONSTRAINT chk_m_jadwal_dokter_jam CHECK (((jam_selesai)::text > (jam_mulai)::text)),
    CONSTRAINT chk_m_jadwal_dokter_kuota CHECK ((kuota > 0))
);


--
-- Name: m_jadwal_dokter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m_jadwal_dokter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m_jadwal_dokter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m_jadwal_dokter_id_seq OWNED BY public.m_jadwal_dokter.id;


--
-- Name: m_menu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m_menu (
    id integer NOT NULL,
    parent_id integer,
    kode character varying(100) NOT NULL,
    nama character varying(100) NOT NULL,
    path character varying(200),
    icon character varying(50),
    urutan integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    deleted_at timestamp(0) without time zone,
    CONSTRAINT chk_m_menu_parent CHECK (((parent_id IS NULL) OR (parent_id <> id)))
);


--
-- Name: m_menu_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m_menu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m_menu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m_menu_id_seq OWNED BY public.m_menu.id;


--
-- Name: m_module; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m_module (
    id integer NOT NULL,
    kode character varying(50) NOT NULL,
    nama character varying(100) NOT NULL,
    icon character varying(50),
    urutan integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    deleted_at timestamp(0) without time zone
);


--
-- Name: m_module_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m_module_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m_module_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m_module_id_seq OWNED BY public.m_module.id;


--
-- Name: m_module_menu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m_module_menu (
    id integer NOT NULL,
    module_id integer NOT NULL,
    menu_id integer NOT NULL,
    urutan integer DEFAULT 0 NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer
);


--
-- Name: m_module_menu_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m_module_menu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m_module_menu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m_module_menu_id_seq OWNED BY public.m_module_menu.id;


--
-- Name: m_obat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m_obat (
    id integer NOT NULL,
    kode character varying(30) NOT NULL,
    nama character varying(150) NOT NULL,
    satuan character varying(30) NOT NULL,
    harga numeric(12,2) DEFAULT 0 NOT NULL,
    stok integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    deleted_at timestamp(0) without time zone,
    CONSTRAINT chk_m_obat_harga CHECK ((harga >= (0)::numeric)),
    CONSTRAINT chk_m_obat_stok CHECK ((stok >= 0))
);


--
-- Name: m_obat_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m_obat_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m_obat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m_obat_id_seq OWNED BY public.m_obat.id;


--
-- Name: m_pasien; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m_pasien (
    id integer NOT NULL,
    no_rm character varying(20) NOT NULL,
    nik character varying(16) NOT NULL,
    nama character varying(100) NOT NULL,
    tgl_lahir date NOT NULL,
    jenis_kelamin character(1) NOT NULL,
    alamat text,
    no_hp character varying(20),
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    deleted_at timestamp(0) without time zone,
    CONSTRAINT chk_m_pasien_jk CHECK ((jenis_kelamin = ANY (ARRAY['L'::bpchar, 'P'::bpchar])))
);


--
-- Name: m_pasien_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m_pasien_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m_pasien_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m_pasien_id_seq OWNED BY public.m_pasien.id;


--
-- Name: m_pemeriksaan_lab; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m_pemeriksaan_lab (
    id integer NOT NULL,
    kode character varying(30) NOT NULL,
    nama character varying(150) NOT NULL,
    satuan character varying(30),
    nilai_rujukan character varying(100),
    tarif numeric(12,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    deleted_at timestamp(0) without time zone,
    CONSTRAINT chk_m_pemeriksaan_lab_tarif CHECK ((tarif >= (0)::numeric))
);


--
-- Name: m_pemeriksaan_lab_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m_pemeriksaan_lab_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m_pemeriksaan_lab_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m_pemeriksaan_lab_id_seq OWNED BY public.m_pemeriksaan_lab.id;


--
-- Name: m_poli; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m_poli (
    id integer NOT NULL,
    kode character varying(30) NOT NULL,
    nama character varying(100) NOT NULL,
    tarif_pendaftaran numeric(12,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    deleted_at timestamp(0) without time zone,
    prefix_antrean character(1) NOT NULL,
    CONSTRAINT chk_m_poli_prefix_antrean CHECK ((prefix_antrean ~ '^[A-Z]$'::text)),
    CONSTRAINT chk_m_poli_tarif CHECK ((tarif_pendaftaran >= (0)::numeric))
);


--
-- Name: m_poli_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m_poli_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m_poli_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m_poli_id_seq OWNED BY public.m_poli.id;


--
-- Name: m_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m_role (
    id integer NOT NULL,
    kode character varying(50) NOT NULL,
    nama character varying(100) NOT NULL,
    keterangan character varying(255),
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    deleted_at timestamp(0) without time zone
);


--
-- Name: m_role_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m_role_access (
    role_id integer NOT NULL,
    menu_id integer NOT NULL,
    can_read boolean DEFAULT false NOT NULL,
    can_create boolean DEFAULT false NOT NULL,
    can_update boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer
);


--
-- Name: m_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m_role_id_seq OWNED BY public.m_role.id;


--
-- Name: m_tindakan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m_tindakan (
    id integer NOT NULL,
    kode character varying(30) NOT NULL,
    nama character varying(150) NOT NULL,
    tarif numeric(12,2) DEFAULT 0 NOT NULL,
    poli_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    deleted_at timestamp(0) without time zone,
    CONSTRAINT chk_m_tindakan_tarif CHECK ((tarif >= (0)::numeric))
);


--
-- Name: m_tindakan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m_tindakan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m_tindakan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m_tindakan_id_seq OWNED BY public.m_tindakan.id;


--
-- Name: m_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m_user (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nama character varying(100) NOT NULL,
    role_id integer NOT NULL,
    dokter_id integer,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    deleted_at timestamp(0) without time zone
);


--
-- Name: m_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.m_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: m_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.m_user_id_seq OWNED BY public.m_user.id;


--
-- Name: migration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migration (
    version character varying(180) NOT NULL,
    apply_time integer
);


--
-- Name: t_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.t_audit_log (
    id integer NOT NULL,
    tabel character varying(64) NOT NULL,
    record_id integer NOT NULL,
    aksi character varying(30) NOT NULL,
    data_lama jsonb,
    data_baru jsonb,
    user_id integer,
    waktu timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer
);


--
-- Name: t_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.t_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: t_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.t_audit_log_id_seq OWNED BY public.t_audit_log.id;


--
-- Name: t_diagnosis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.t_diagnosis (
    id integer NOT NULL,
    kunjungan_id integer NOT NULL,
    icd10_id integer NOT NULL,
    jenis character varying(10) NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    CONSTRAINT chk_t_diagnosis_jenis CHECK (((jenis)::text = ANY ((ARRAY['utama'::character varying, 'sekunder'::character varying])::text[])))
);


--
-- Name: t_diagnosis_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.t_diagnosis_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: t_diagnosis_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.t_diagnosis_id_seq OWNED BY public.t_diagnosis.id;


--
-- Name: t_integration_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.t_integration_outbox (
    id integer NOT NULL,
    idempotency_key character varying(100) NOT NULL,
    tujuan character varying(200) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    percobaan integer DEFAULT 0 NOT NULL,
    retry_berikutnya timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    error_terakhir text,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    CONSTRAINT chk_t_integration_outbox_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'terkirim'::character varying, 'gagal'::character varying])::text[])))
);


--
-- Name: t_integration_outbox_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.t_integration_outbox_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: t_integration_outbox_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.t_integration_outbox_id_seq OWNED BY public.t_integration_outbox.id;


--
-- Name: t_invoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.t_invoice (
    id integer NOT NULL,
    no_invoice character varying(30) NOT NULL,
    kunjungan_id integer NOT NULL,
    total numeric(14,2) DEFAULT 0 NOT NULL,
    total_bayar numeric(14,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'belum_dibayar'::character varying NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    CONSTRAINT chk_t_invoice_status CHECK (((status)::text = ANY ((ARRAY['belum_dibayar'::character varying, 'dibayar_sebagian'::character varying, 'lunas'::character varying])::text[]))),
    CONSTRAINT chk_t_invoice_total CHECK ((total >= (0)::numeric)),
    CONSTRAINT chk_t_invoice_total_bayar CHECK (((total_bayar >= (0)::numeric) AND (total_bayar <= total)))
);


--
-- Name: t_invoice_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.t_invoice_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: t_invoice_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.t_invoice_id_seq OWNED BY public.t_invoice.id;


--
-- Name: t_invoice_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.t_invoice_item (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    sumber character varying(20) NOT NULL,
    referensi_id integer NOT NULL,
    deskripsi character varying(200) NOT NULL,
    qty integer DEFAULT 1 NOT NULL,
    harga numeric(14,2) NOT NULL,
    subtotal numeric(14,2) NOT NULL,
    is_void boolean DEFAULT false NOT NULL,
    alasan_void character varying(255),
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    CONSTRAINT chk_t_invoice_item_harga CHECK ((harga >= (0)::numeric)),
    CONSTRAINT chk_t_invoice_item_qty CHECK ((qty > 0)),
    CONSTRAINT chk_t_invoice_item_subtotal CHECK ((subtotal = ((qty)::numeric * harga))),
    CONSTRAINT chk_t_invoice_item_sumber CHECK (((sumber)::text = ANY ((ARRAY['pendaftaran'::character varying, 'tindakan'::character varying, 'lab'::character varying, 'obat'::character varying])::text[]))),
    CONSTRAINT chk_t_invoice_item_void CHECK (((NOT is_void) OR ((alasan_void IS NOT NULL) AND (length(TRIM(BOTH FROM alasan_void)) > 0))))
);


--
-- Name: t_invoice_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.t_invoice_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: t_invoice_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.t_invoice_item_id_seq OWNED BY public.t_invoice_item.id;


--
-- Name: t_kunjungan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.t_kunjungan (
    id integer NOT NULL,
    no_kunjungan character varying(30) NOT NULL,
    pasien_id integer NOT NULL,
    poli_id integer NOT NULL,
    dokter_id integer NOT NULL,
    jadwal_id integer NOT NULL,
    tgl_kunjungan date NOT NULL,
    no_antrean integer NOT NULL,
    status character varying(20) DEFAULT 'menunggu'::character varying NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    penjamin character varying(20) DEFAULT 'umum'::character varying NOT NULL,
    CONSTRAINT chk_t_kunjungan_no_antrean CHECK ((no_antrean > 0)),
    CONSTRAINT chk_t_kunjungan_penjamin CHECK (((penjamin)::text = ANY ((ARRAY['umum'::character varying, 'bpjs'::character varying, 'asuransi'::character varying])::text[]))),
    CONSTRAINT chk_t_kunjungan_status CHECK (((status)::text = ANY ((ARRAY['menunggu'::character varying, 'diperiksa'::character varying, 'selesai'::character varying, 'batal'::character varying])::text[])))
);


--
-- Name: t_kunjungan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.t_kunjungan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: t_kunjungan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.t_kunjungan_id_seq OWNED BY public.t_kunjungan.id;


--
-- Name: t_kunjungan_status_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.t_kunjungan_status_log (
    id integer NOT NULL,
    kunjungan_id integer NOT NULL,
    status_lama character varying(20),
    status_baru character varying(20) NOT NULL,
    user_id integer,
    waktu timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer
);


--
-- Name: t_kunjungan_status_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.t_kunjungan_status_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: t_kunjungan_status_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.t_kunjungan_status_log_id_seq OWNED BY public.t_kunjungan_status_log.id;


--
-- Name: t_order_lab; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.t_order_lab (
    id integer NOT NULL,
    no_order character varying(30) NOT NULL,
    kunjungan_id integer NOT NULL,
    dokter_id integer NOT NULL,
    status character varying(20) DEFAULT 'diminta'::character varying NOT NULL,
    catatan_klinis text,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    CONSTRAINT chk_t_order_lab_status CHECK (((status)::text = ANY ((ARRAY['diminta'::character varying, 'diproses'::character varying, 'selesai'::character varying])::text[])))
);


--
-- Name: t_order_lab_detail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.t_order_lab_detail (
    id integer NOT NULL,
    order_id integer NOT NULL,
    pemeriksaan_lab_id integer NOT NULL,
    tarif numeric(12,2) NOT NULL,
    hasil character varying(100),
    satuan character varying(30),
    nilai_rujukan character varying(100),
    flag character varying(10),
    idempotency_key character varying(100),
    diinput_oleh integer,
    diinput_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    CONSTRAINT chk_t_order_lab_detail_flag CHECK (((flag)::text = ANY ((ARRAY['normal'::character varying, 'tinggi'::character varying, 'rendah'::character varying])::text[]))),
    CONSTRAINT chk_t_order_lab_detail_tarif CHECK ((tarif >= (0)::numeric))
);


--
-- Name: t_order_lab_detail_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.t_order_lab_detail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: t_order_lab_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.t_order_lab_detail_id_seq OWNED BY public.t_order_lab_detail.id;


--
-- Name: t_order_lab_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.t_order_lab_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: t_order_lab_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.t_order_lab_id_seq OWNED BY public.t_order_lab.id;


--
-- Name: t_pembayaran; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.t_pembayaran (
    id integer NOT NULL,
    no_pembayaran character varying(30) NOT NULL,
    invoice_id integer NOT NULL,
    idempotency_key character varying(100) NOT NULL,
    metode character varying(20) NOT NULL,
    jumlah numeric(14,2) NOT NULL,
    no_referensi character varying(100),
    kasir_id integer NOT NULL,
    dibayar_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    CONSTRAINT chk_t_pembayaran_jumlah CHECK ((jumlah > (0)::numeric)),
    CONSTRAINT chk_t_pembayaran_metode CHECK (((metode)::text = ANY ((ARRAY['tunai'::character varying, 'non_tunai'::character varying])::text[])))
);


--
-- Name: t_pembayaran_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.t_pembayaran_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: t_pembayaran_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.t_pembayaran_id_seq OWNED BY public.t_pembayaran.id;


--
-- Name: t_pemeriksaan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.t_pemeriksaan (
    id integer NOT NULL,
    kunjungan_id integer NOT NULL,
    dokter_id integer NOT NULL,
    keluhan_utama text,
    anamnesis text,
    td_sistolik smallint,
    td_diastolik smallint,
    nadi smallint,
    suhu numeric(4,1),
    respirasi smallint,
    spo2 smallint,
    berat_badan numeric(5,1),
    tinggi_badan numeric(5,1),
    pemeriksaan_fisik text,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    CONSTRAINT chk_t_pemeriksaan_berat_badan CHECK (((berat_badan >= 0.5) AND (berat_badan <= (500)::numeric))),
    CONSTRAINT chk_t_pemeriksaan_nadi CHECK (((nadi >= 20) AND (nadi <= 250))),
    CONSTRAINT chk_t_pemeriksaan_respirasi CHECK (((respirasi >= 5) AND (respirasi <= 80))),
    CONSTRAINT chk_t_pemeriksaan_spo2 CHECK (((spo2 >= 50) AND (spo2 <= 100))),
    CONSTRAINT chk_t_pemeriksaan_suhu CHECK (((suhu >= (30)::numeric) AND (suhu <= (45)::numeric))),
    CONSTRAINT chk_t_pemeriksaan_td_diastolik CHECK (((td_diastolik >= 30) AND (td_diastolik <= 200))),
    CONSTRAINT chk_t_pemeriksaan_td_sistolik CHECK (((td_sistolik >= 50) AND (td_sistolik <= 300))),
    CONSTRAINT chk_t_pemeriksaan_tinggi_badan CHECK (((tinggi_badan >= (20)::numeric) AND (tinggi_badan <= (250)::numeric)))
);


--
-- Name: t_pemeriksaan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.t_pemeriksaan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: t_pemeriksaan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.t_pemeriksaan_id_seq OWNED BY public.t_pemeriksaan.id;


--
-- Name: t_resep; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.t_resep (
    id integer NOT NULL,
    no_resep character varying(30) NOT NULL,
    kunjungan_id integer NOT NULL,
    dokter_id integer NOT NULL,
    status character varying(20) DEFAULT 'baru'::character varying NOT NULL,
    catatan text,
    diserahkan_oleh integer,
    diserahkan_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    CONSTRAINT chk_t_resep_diserahkan CHECK ((((status)::text <> 'diserahkan'::text) OR (diserahkan_at IS NOT NULL))),
    CONSTRAINT chk_t_resep_status CHECK (((status)::text = ANY ((ARRAY['baru'::character varying, 'diproses'::character varying, 'diserahkan'::character varying, 'batal'::character varying])::text[])))
);


--
-- Name: t_resep_detail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.t_resep_detail (
    id integer NOT NULL,
    resep_id integer NOT NULL,
    obat_id integer NOT NULL,
    dosis character varying(50) NOT NULL,
    frekuensi character varying(50) NOT NULL,
    jumlah integer NOT NULL,
    harga numeric(12,2) NOT NULL,
    subtotal numeric(14,2) NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    CONSTRAINT chk_t_resep_detail_harga CHECK ((harga >= (0)::numeric)),
    CONSTRAINT chk_t_resep_detail_jumlah CHECK ((jumlah > 0)),
    CONSTRAINT chk_t_resep_detail_subtotal CHECK ((subtotal = ((jumlah)::numeric * harga)))
);


--
-- Name: t_resep_detail_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.t_resep_detail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: t_resep_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.t_resep_detail_id_seq OWNED BY public.t_resep_detail.id;


--
-- Name: t_resep_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.t_resep_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: t_resep_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.t_resep_id_seq OWNED BY public.t_resep.id;


--
-- Name: t_sequence_counter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.t_sequence_counter (
    kode character varying(50) NOT NULL,
    periode character varying(30) NOT NULL,
    nilai_terakhir integer DEFAULT 0 NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer
);


--
-- Name: t_stok_mutasi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.t_stok_mutasi (
    id integer NOT NULL,
    obat_id integer NOT NULL,
    jenis character varying(20) NOT NULL,
    qty integer NOT NULL,
    stok_sebelum integer NOT NULL,
    stok_sesudah integer NOT NULL,
    referensi character varying(150),
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    CONSTRAINT chk_t_stok_mutasi_jenis CHECK (((jenis)::text = ANY ((ARRAY['keluar'::character varying, 'masuk'::character varying, 'penyesuaian'::character varying])::text[]))),
    CONSTRAINT chk_t_stok_mutasi_stok_sesudah CHECK ((stok_sesudah >= 0))
);


--
-- Name: t_stok_mutasi_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.t_stok_mutasi_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: t_stok_mutasi_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.t_stok_mutasi_id_seq OWNED BY public.t_stok_mutasi.id;


--
-- Name: t_tindakan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.t_tindakan (
    id integer NOT NULL,
    kunjungan_id integer NOT NULL,
    tindakan_id integer NOT NULL,
    qty integer DEFAULT 1 NOT NULL,
    tarif numeric(14,2) NOT NULL,
    subtotal numeric(14,2) NOT NULL,
    dokter_id integer NOT NULL,
    status character varying(10) DEFAULT 'aktif'::character varying NOT NULL,
    created_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(0) without time zone,
    created_by integer,
    updated_by integer,
    CONSTRAINT chk_t_tindakan_qty CHECK ((qty > 0)),
    CONSTRAINT chk_t_tindakan_status CHECK (((status)::text = ANY ((ARRAY['aktif'::character varying, 'batal'::character varying])::text[]))),
    CONSTRAINT chk_t_tindakan_subtotal CHECK ((subtotal = ((qty)::numeric * tarif))),
    CONSTRAINT chk_t_tindakan_tarif CHECK ((tarif >= (0)::numeric))
);


--
-- Name: t_tindakan_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.t_tindakan_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: t_tindakan_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.t_tindakan_id_seq OWNED BY public.t_tindakan.id;


--
-- Name: m_dokter id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_dokter ALTER COLUMN id SET DEFAULT nextval('public.m_dokter_id_seq'::regclass);


--
-- Name: m_icd10 id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_icd10 ALTER COLUMN id SET DEFAULT nextval('public.m_icd10_id_seq'::regclass);


--
-- Name: m_jadwal_dokter id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_jadwal_dokter ALTER COLUMN id SET DEFAULT nextval('public.m_jadwal_dokter_id_seq'::regclass);


--
-- Name: m_menu id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_menu ALTER COLUMN id SET DEFAULT nextval('public.m_menu_id_seq'::regclass);


--
-- Name: m_module id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_module ALTER COLUMN id SET DEFAULT nextval('public.m_module_id_seq'::regclass);


--
-- Name: m_module_menu id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_module_menu ALTER COLUMN id SET DEFAULT nextval('public.m_module_menu_id_seq'::regclass);


--
-- Name: m_obat id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_obat ALTER COLUMN id SET DEFAULT nextval('public.m_obat_id_seq'::regclass);


--
-- Name: m_pasien id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_pasien ALTER COLUMN id SET DEFAULT nextval('public.m_pasien_id_seq'::regclass);


--
-- Name: m_pemeriksaan_lab id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_pemeriksaan_lab ALTER COLUMN id SET DEFAULT nextval('public.m_pemeriksaan_lab_id_seq'::regclass);


--
-- Name: m_poli id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_poli ALTER COLUMN id SET DEFAULT nextval('public.m_poli_id_seq'::regclass);


--
-- Name: m_role id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_role ALTER COLUMN id SET DEFAULT nextval('public.m_role_id_seq'::regclass);


--
-- Name: m_tindakan id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_tindakan ALTER COLUMN id SET DEFAULT nextval('public.m_tindakan_id_seq'::regclass);


--
-- Name: m_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_user ALTER COLUMN id SET DEFAULT nextval('public.m_user_id_seq'::regclass);


--
-- Name: t_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_audit_log ALTER COLUMN id SET DEFAULT nextval('public.t_audit_log_id_seq'::regclass);


--
-- Name: t_diagnosis id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_diagnosis ALTER COLUMN id SET DEFAULT nextval('public.t_diagnosis_id_seq'::regclass);


--
-- Name: t_integration_outbox id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_integration_outbox ALTER COLUMN id SET DEFAULT nextval('public.t_integration_outbox_id_seq'::regclass);


--
-- Name: t_invoice id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_invoice ALTER COLUMN id SET DEFAULT nextval('public.t_invoice_id_seq'::regclass);


--
-- Name: t_invoice_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_invoice_item ALTER COLUMN id SET DEFAULT nextval('public.t_invoice_item_id_seq'::regclass);


--
-- Name: t_kunjungan id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_kunjungan ALTER COLUMN id SET DEFAULT nextval('public.t_kunjungan_id_seq'::regclass);


--
-- Name: t_kunjungan_status_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_kunjungan_status_log ALTER COLUMN id SET DEFAULT nextval('public.t_kunjungan_status_log_id_seq'::regclass);


--
-- Name: t_order_lab id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_order_lab ALTER COLUMN id SET DEFAULT nextval('public.t_order_lab_id_seq'::regclass);


--
-- Name: t_order_lab_detail id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_order_lab_detail ALTER COLUMN id SET DEFAULT nextval('public.t_order_lab_detail_id_seq'::regclass);


--
-- Name: t_pembayaran id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_pembayaran ALTER COLUMN id SET DEFAULT nextval('public.t_pembayaran_id_seq'::regclass);


--
-- Name: t_pemeriksaan id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_pemeriksaan ALTER COLUMN id SET DEFAULT nextval('public.t_pemeriksaan_id_seq'::regclass);


--
-- Name: t_resep id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_resep ALTER COLUMN id SET DEFAULT nextval('public.t_resep_id_seq'::regclass);


--
-- Name: t_resep_detail id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_resep_detail ALTER COLUMN id SET DEFAULT nextval('public.t_resep_detail_id_seq'::regclass);


--
-- Name: t_stok_mutasi id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_stok_mutasi ALTER COLUMN id SET DEFAULT nextval('public.t_stok_mutasi_id_seq'::regclass);


--
-- Name: t_tindakan id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_tindakan ALTER COLUMN id SET DEFAULT nextval('public.t_tindakan_id_seq'::regclass);


--
-- Name: m_dokter m_dokter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_dokter
    ADD CONSTRAINT m_dokter_pkey PRIMARY KEY (id);


--
-- Name: m_icd10 m_icd10_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_icd10
    ADD CONSTRAINT m_icd10_pkey PRIMARY KEY (id);


--
-- Name: m_jadwal_dokter m_jadwal_dokter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_jadwal_dokter
    ADD CONSTRAINT m_jadwal_dokter_pkey PRIMARY KEY (id);


--
-- Name: m_menu m_menu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_menu
    ADD CONSTRAINT m_menu_pkey PRIMARY KEY (id);


--
-- Name: m_module_menu m_module_menu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_module_menu
    ADD CONSTRAINT m_module_menu_pkey PRIMARY KEY (id);


--
-- Name: m_module m_module_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_module
    ADD CONSTRAINT m_module_pkey PRIMARY KEY (id);


--
-- Name: m_obat m_obat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_obat
    ADD CONSTRAINT m_obat_pkey PRIMARY KEY (id);


--
-- Name: m_pasien m_pasien_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_pasien
    ADD CONSTRAINT m_pasien_pkey PRIMARY KEY (id);


--
-- Name: m_pemeriksaan_lab m_pemeriksaan_lab_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_pemeriksaan_lab
    ADD CONSTRAINT m_pemeriksaan_lab_pkey PRIMARY KEY (id);


--
-- Name: m_poli m_poli_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_poli
    ADD CONSTRAINT m_poli_pkey PRIMARY KEY (id);


--
-- Name: m_role m_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_role
    ADD CONSTRAINT m_role_pkey PRIMARY KEY (id);


--
-- Name: m_tindakan m_tindakan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_tindakan
    ADD CONSTRAINT m_tindakan_pkey PRIMARY KEY (id);


--
-- Name: m_user m_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_user
    ADD CONSTRAINT m_user_pkey PRIMARY KEY (id);


--
-- Name: migration migration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration
    ADD CONSTRAINT migration_pkey PRIMARY KEY (version);


--
-- Name: m_role_access pk_m_role_access; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_role_access
    ADD CONSTRAINT pk_m_role_access PRIMARY KEY (role_id, menu_id);


--
-- Name: t_sequence_counter pk_t_sequence_counter; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_sequence_counter
    ADD CONSTRAINT pk_t_sequence_counter PRIMARY KEY (kode, periode);


--
-- Name: t_audit_log t_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_audit_log
    ADD CONSTRAINT t_audit_log_pkey PRIMARY KEY (id);


--
-- Name: t_diagnosis t_diagnosis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_diagnosis
    ADD CONSTRAINT t_diagnosis_pkey PRIMARY KEY (id);


--
-- Name: t_integration_outbox t_integration_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_integration_outbox
    ADD CONSTRAINT t_integration_outbox_pkey PRIMARY KEY (id);


--
-- Name: t_invoice_item t_invoice_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_invoice_item
    ADD CONSTRAINT t_invoice_item_pkey PRIMARY KEY (id);


--
-- Name: t_invoice t_invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_invoice
    ADD CONSTRAINT t_invoice_pkey PRIMARY KEY (id);


--
-- Name: t_kunjungan t_kunjungan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_kunjungan
    ADD CONSTRAINT t_kunjungan_pkey PRIMARY KEY (id);


--
-- Name: t_kunjungan_status_log t_kunjungan_status_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_kunjungan_status_log
    ADD CONSTRAINT t_kunjungan_status_log_pkey PRIMARY KEY (id);


--
-- Name: t_order_lab_detail t_order_lab_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_order_lab_detail
    ADD CONSTRAINT t_order_lab_detail_pkey PRIMARY KEY (id);


--
-- Name: t_order_lab t_order_lab_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_order_lab
    ADD CONSTRAINT t_order_lab_pkey PRIMARY KEY (id);


--
-- Name: t_pembayaran t_pembayaran_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_pembayaran
    ADD CONSTRAINT t_pembayaran_pkey PRIMARY KEY (id);


--
-- Name: t_pemeriksaan t_pemeriksaan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_pemeriksaan
    ADD CONSTRAINT t_pemeriksaan_pkey PRIMARY KEY (id);


--
-- Name: t_resep_detail t_resep_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_resep_detail
    ADD CONSTRAINT t_resep_detail_pkey PRIMARY KEY (id);


--
-- Name: t_resep t_resep_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_resep
    ADD CONSTRAINT t_resep_pkey PRIMARY KEY (id);


--
-- Name: t_stok_mutasi t_stok_mutasi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_stok_mutasi
    ADD CONSTRAINT t_stok_mutasi_pkey PRIMARY KEY (id);


--
-- Name: t_tindakan t_tindakan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_tindakan
    ADD CONSTRAINT t_tindakan_pkey PRIMARY KEY (id);


--
-- Name: idx_m_dokter_jenis_tenaga; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m_dokter_jenis_tenaga ON public.m_dokter USING btree (jenis_tenaga);


--
-- Name: idx_m_icd10_nama; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m_icd10_nama ON public.m_icd10 USING btree (nama);


--
-- Name: idx_m_jadwal_dokter_dokter_hari; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m_jadwal_dokter_dokter_hari ON public.m_jadwal_dokter USING btree (dokter_id, hari);


--
-- Name: idx_m_jadwal_dokter_poli_hari; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m_jadwal_dokter_poli_hari ON public.m_jadwal_dokter USING btree (poli_id, hari);


--
-- Name: idx_m_menu_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m_menu_parent_id ON public.m_menu USING btree (parent_id);


--
-- Name: idx_m_module_menu_menu_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m_module_menu_menu_id ON public.m_module_menu USING btree (menu_id);


--
-- Name: idx_m_obat_nama; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m_obat_nama ON public.m_obat USING btree (nama);


--
-- Name: idx_m_pasien_nama; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m_pasien_nama ON public.m_pasien USING btree (nama);


--
-- Name: idx_m_role_access_menu_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m_role_access_menu_id ON public.m_role_access USING btree (menu_id);


--
-- Name: idx_m_tindakan_poli_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m_tindakan_poli_id ON public.m_tindakan USING btree (poli_id);


--
-- Name: idx_m_user_dokter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m_user_dokter_id ON public.m_user USING btree (dokter_id);


--
-- Name: idx_m_user_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_m_user_role_id ON public.m_user USING btree (role_id);


--
-- Name: idx_t_audit_log_tabel_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_audit_log_tabel_record ON public.t_audit_log USING btree (tabel, record_id);


--
-- Name: idx_t_integration_outbox_antrean; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_integration_outbox_antrean ON public.t_integration_outbox USING btree (status, retry_berikutnya);


--
-- Name: idx_t_invoice_item_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_invoice_item_invoice_id ON public.t_invoice_item USING btree (invoice_id);


--
-- Name: idx_t_invoice_item_invoice_sumber_aktif; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_invoice_item_invoice_sumber_aktif ON public.t_invoice_item USING btree (invoice_id, sumber) WHERE (is_void = false);


--
-- Name: idx_t_invoice_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_invoice_status ON public.t_invoice USING btree (status);


--
-- Name: idx_t_kunjungan_dokter_penjamin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_kunjungan_dokter_penjamin ON public.t_kunjungan USING btree (dokter_id, penjamin);


--
-- Name: idx_t_kunjungan_status_log_kunjungan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_kunjungan_status_log_kunjungan_id ON public.t_kunjungan_status_log USING btree (kunjungan_id);


--
-- Name: idx_t_kunjungan_tgl_poli; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_kunjungan_tgl_poli ON public.t_kunjungan USING btree (tgl_kunjungan, poli_id);


--
-- Name: idx_t_order_lab_kunjungan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_order_lab_kunjungan_id ON public.t_order_lab USING btree (kunjungan_id);


--
-- Name: idx_t_order_lab_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_order_lab_status ON public.t_order_lab USING btree (status);


--
-- Name: idx_t_pembayaran_dibayar_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_pembayaran_dibayar_at ON public.t_pembayaran USING btree (dibayar_at);


--
-- Name: idx_t_pembayaran_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_pembayaran_invoice_id ON public.t_pembayaran USING btree (invoice_id);


--
-- Name: idx_t_resep_kunjungan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_resep_kunjungan_id ON public.t_resep USING btree (kunjungan_id);


--
-- Name: idx_t_resep_kunjungan_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_resep_kunjungan_status ON public.t_resep USING btree (kunjungan_id, status);


--
-- Name: idx_t_resep_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_resep_status ON public.t_resep USING btree (status);


--
-- Name: idx_t_stok_mutasi_obat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_stok_mutasi_obat_id ON public.t_stok_mutasi USING btree (obat_id);


--
-- Name: idx_t_tindakan_kunjungan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_tindakan_kunjungan_id ON public.t_tindakan USING btree (kunjungan_id);


--
-- Name: idx_t_tindakan_kunjungan_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_t_tindakan_kunjungan_status ON public.t_tindakan USING btree (kunjungan_id, status);


--
-- Name: uq_m_dokter_kode; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_m_dokter_kode ON public.m_dokter USING btree (kode) WHERE (deleted_at IS NULL);


--
-- Name: uq_m_dokter_sip; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_m_dokter_sip ON public.m_dokter USING btree (sip) WHERE (deleted_at IS NULL);


--
-- Name: uq_m_icd10_kode; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_m_icd10_kode ON public.m_icd10 USING btree (kode) WHERE (deleted_at IS NULL);


--
-- Name: uq_m_menu_kode; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_m_menu_kode ON public.m_menu USING btree (kode) WHERE (deleted_at IS NULL);


--
-- Name: uq_m_module_kode; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_m_module_kode ON public.m_module USING btree (kode) WHERE (deleted_at IS NULL);


--
-- Name: uq_m_module_menu; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_m_module_menu ON public.m_module_menu USING btree (module_id, menu_id);


--
-- Name: uq_m_obat_kode; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_m_obat_kode ON public.m_obat USING btree (kode) WHERE (deleted_at IS NULL);


--
-- Name: uq_m_pasien_nik; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_m_pasien_nik ON public.m_pasien USING btree (nik) WHERE (deleted_at IS NULL);


--
-- Name: uq_m_pasien_no_rm; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_m_pasien_no_rm ON public.m_pasien USING btree (no_rm) WHERE (deleted_at IS NULL);


--
-- Name: uq_m_pemeriksaan_lab_kode; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_m_pemeriksaan_lab_kode ON public.m_pemeriksaan_lab USING btree (kode) WHERE (deleted_at IS NULL);


--
-- Name: uq_m_poli_kode; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_m_poli_kode ON public.m_poli USING btree (kode) WHERE (deleted_at IS NULL);


--
-- Name: uq_m_poli_prefix_antrean; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_m_poli_prefix_antrean ON public.m_poli USING btree (prefix_antrean) WHERE (deleted_at IS NULL);


--
-- Name: uq_m_role_kode; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_m_role_kode ON public.m_role USING btree (kode) WHERE (deleted_at IS NULL);


--
-- Name: uq_m_tindakan_kode; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_m_tindakan_kode ON public.m_tindakan USING btree (kode) WHERE (deleted_at IS NULL);


--
-- Name: uq_m_user_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_m_user_username ON public.m_user USING btree (username) WHERE (deleted_at IS NULL);


--
-- Name: uq_t_diagnosis_kunjungan_icd10; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_t_diagnosis_kunjungan_icd10 ON public.t_diagnosis USING btree (kunjungan_id, icd10_id);


--
-- Name: uq_t_diagnosis_utama; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_t_diagnosis_utama ON public.t_diagnosis USING btree (kunjungan_id) WHERE ((jenis)::text = 'utama'::text);


--
-- Name: uq_t_integration_outbox_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_t_integration_outbox_idempotency_key ON public.t_integration_outbox USING btree (idempotency_key);


--
-- Name: uq_t_invoice_item_aktif; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_t_invoice_item_aktif ON public.t_invoice_item USING btree (invoice_id, sumber, referensi_id) WHERE (is_void = false);


--
-- Name: uq_t_invoice_kunjungan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_t_invoice_kunjungan_id ON public.t_invoice USING btree (kunjungan_id);


--
-- Name: uq_t_invoice_no_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_t_invoice_no_invoice ON public.t_invoice USING btree (no_invoice);


--
-- Name: uq_t_kunjungan_antrean; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_t_kunjungan_antrean ON public.t_kunjungan USING btree (poli_id, dokter_id, tgl_kunjungan, no_antrean);


--
-- Name: uq_t_kunjungan_no_kunjungan; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_t_kunjungan_no_kunjungan ON public.t_kunjungan USING btree (no_kunjungan);


--
-- Name: uq_t_kunjungan_pasien_poli_tgl_aktif; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_t_kunjungan_pasien_poli_tgl_aktif ON public.t_kunjungan USING btree (pasien_id, poli_id, tgl_kunjungan) WHERE ((status)::text <> 'batal'::text);


--
-- Name: uq_t_order_lab_detail_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_t_order_lab_detail_idempotency_key ON public.t_order_lab_detail USING btree (idempotency_key);


--
-- Name: uq_t_order_lab_detail_order_pemeriksaan; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_t_order_lab_detail_order_pemeriksaan ON public.t_order_lab_detail USING btree (order_id, pemeriksaan_lab_id);


--
-- Name: uq_t_order_lab_no_order; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_t_order_lab_no_order ON public.t_order_lab USING btree (no_order);


--
-- Name: uq_t_pembayaran_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_t_pembayaran_idempotency_key ON public.t_pembayaran USING btree (idempotency_key);


--
-- Name: uq_t_pembayaran_no_pembayaran; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_t_pembayaran_no_pembayaran ON public.t_pembayaran USING btree (no_pembayaran);


--
-- Name: uq_t_pemeriksaan_kunjungan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_t_pemeriksaan_kunjungan_id ON public.t_pemeriksaan USING btree (kunjungan_id);


--
-- Name: uq_t_resep_detail_resep_obat; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_t_resep_detail_resep_obat ON public.t_resep_detail USING btree (resep_id, obat_id);


--
-- Name: uq_t_resep_no_resep; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_t_resep_no_resep ON public.t_resep USING btree (no_resep);


--
-- Name: m_jadwal_dokter fk_m_jadwal_dokter_dokter; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_jadwal_dokter
    ADD CONSTRAINT fk_m_jadwal_dokter_dokter FOREIGN KEY (dokter_id) REFERENCES public.m_dokter(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: m_jadwal_dokter fk_m_jadwal_dokter_poli; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_jadwal_dokter
    ADD CONSTRAINT fk_m_jadwal_dokter_poli FOREIGN KEY (poli_id) REFERENCES public.m_poli(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: m_menu fk_m_menu_parent; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_menu
    ADD CONSTRAINT fk_m_menu_parent FOREIGN KEY (parent_id) REFERENCES public.m_menu(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: m_module_menu fk_m_module_menu_menu; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_module_menu
    ADD CONSTRAINT fk_m_module_menu_menu FOREIGN KEY (menu_id) REFERENCES public.m_menu(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: m_module_menu fk_m_module_menu_module; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_module_menu
    ADD CONSTRAINT fk_m_module_menu_module FOREIGN KEY (module_id) REFERENCES public.m_module(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: m_role_access fk_m_role_access_menu; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_role_access
    ADD CONSTRAINT fk_m_role_access_menu FOREIGN KEY (menu_id) REFERENCES public.m_menu(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: m_role_access fk_m_role_access_role; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_role_access
    ADD CONSTRAINT fk_m_role_access_role FOREIGN KEY (role_id) REFERENCES public.m_role(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: m_tindakan fk_m_tindakan_poli; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_tindakan
    ADD CONSTRAINT fk_m_tindakan_poli FOREIGN KEY (poli_id) REFERENCES public.m_poli(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: m_user fk_m_user_dokter; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_user
    ADD CONSTRAINT fk_m_user_dokter FOREIGN KEY (dokter_id) REFERENCES public.m_dokter(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: m_user fk_m_user_role; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m_user
    ADD CONSTRAINT fk_m_user_role FOREIGN KEY (role_id) REFERENCES public.m_role(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_audit_log fk_t_audit_log_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_audit_log
    ADD CONSTRAINT fk_t_audit_log_user FOREIGN KEY (user_id) REFERENCES public.m_user(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: t_diagnosis fk_t_diagnosis_icd10; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_diagnosis
    ADD CONSTRAINT fk_t_diagnosis_icd10 FOREIGN KEY (icd10_id) REFERENCES public.m_icd10(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_diagnosis fk_t_diagnosis_kunjungan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_diagnosis
    ADD CONSTRAINT fk_t_diagnosis_kunjungan FOREIGN KEY (kunjungan_id) REFERENCES public.t_kunjungan(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: t_invoice_item fk_t_invoice_item_invoice; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_invoice_item
    ADD CONSTRAINT fk_t_invoice_item_invoice FOREIGN KEY (invoice_id) REFERENCES public.t_invoice(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: t_invoice fk_t_invoice_kunjungan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_invoice
    ADD CONSTRAINT fk_t_invoice_kunjungan FOREIGN KEY (kunjungan_id) REFERENCES public.t_kunjungan(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_kunjungan fk_t_kunjungan_dokter; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_kunjungan
    ADD CONSTRAINT fk_t_kunjungan_dokter FOREIGN KEY (dokter_id) REFERENCES public.m_dokter(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_kunjungan fk_t_kunjungan_jadwal; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_kunjungan
    ADD CONSTRAINT fk_t_kunjungan_jadwal FOREIGN KEY (jadwal_id) REFERENCES public.m_jadwal_dokter(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_kunjungan fk_t_kunjungan_pasien; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_kunjungan
    ADD CONSTRAINT fk_t_kunjungan_pasien FOREIGN KEY (pasien_id) REFERENCES public.m_pasien(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_kunjungan fk_t_kunjungan_poli; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_kunjungan
    ADD CONSTRAINT fk_t_kunjungan_poli FOREIGN KEY (poli_id) REFERENCES public.m_poli(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_kunjungan_status_log fk_t_kunjungan_status_log_kunjungan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_kunjungan_status_log
    ADD CONSTRAINT fk_t_kunjungan_status_log_kunjungan FOREIGN KEY (kunjungan_id) REFERENCES public.t_kunjungan(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: t_order_lab_detail fk_t_order_lab_detail_diinput_oleh; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_order_lab_detail
    ADD CONSTRAINT fk_t_order_lab_detail_diinput_oleh FOREIGN KEY (diinput_oleh) REFERENCES public.m_user(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: t_order_lab_detail fk_t_order_lab_detail_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_order_lab_detail
    ADD CONSTRAINT fk_t_order_lab_detail_order FOREIGN KEY (order_id) REFERENCES public.t_order_lab(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: t_order_lab_detail fk_t_order_lab_detail_pemeriksaan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_order_lab_detail
    ADD CONSTRAINT fk_t_order_lab_detail_pemeriksaan FOREIGN KEY (pemeriksaan_lab_id) REFERENCES public.m_pemeriksaan_lab(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_order_lab fk_t_order_lab_dokter; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_order_lab
    ADD CONSTRAINT fk_t_order_lab_dokter FOREIGN KEY (dokter_id) REFERENCES public.m_dokter(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_order_lab fk_t_order_lab_kunjungan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_order_lab
    ADD CONSTRAINT fk_t_order_lab_kunjungan FOREIGN KEY (kunjungan_id) REFERENCES public.t_kunjungan(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_pembayaran fk_t_pembayaran_invoice; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_pembayaran
    ADD CONSTRAINT fk_t_pembayaran_invoice FOREIGN KEY (invoice_id) REFERENCES public.t_invoice(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_pembayaran fk_t_pembayaran_kasir; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_pembayaran
    ADD CONSTRAINT fk_t_pembayaran_kasir FOREIGN KEY (kasir_id) REFERENCES public.m_user(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_pemeriksaan fk_t_pemeriksaan_dokter; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_pemeriksaan
    ADD CONSTRAINT fk_t_pemeriksaan_dokter FOREIGN KEY (dokter_id) REFERENCES public.m_dokter(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_pemeriksaan fk_t_pemeriksaan_kunjungan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_pemeriksaan
    ADD CONSTRAINT fk_t_pemeriksaan_kunjungan FOREIGN KEY (kunjungan_id) REFERENCES public.t_kunjungan(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_resep_detail fk_t_resep_detail_obat; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_resep_detail
    ADD CONSTRAINT fk_t_resep_detail_obat FOREIGN KEY (obat_id) REFERENCES public.m_obat(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_resep_detail fk_t_resep_detail_resep; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_resep_detail
    ADD CONSTRAINT fk_t_resep_detail_resep FOREIGN KEY (resep_id) REFERENCES public.t_resep(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: t_resep fk_t_resep_diserahkan_oleh; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_resep
    ADD CONSTRAINT fk_t_resep_diserahkan_oleh FOREIGN KEY (diserahkan_oleh) REFERENCES public.m_user(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: t_resep fk_t_resep_dokter; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_resep
    ADD CONSTRAINT fk_t_resep_dokter FOREIGN KEY (dokter_id) REFERENCES public.m_dokter(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_resep fk_t_resep_kunjungan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_resep
    ADD CONSTRAINT fk_t_resep_kunjungan FOREIGN KEY (kunjungan_id) REFERENCES public.t_kunjungan(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_stok_mutasi fk_t_stok_mutasi_obat; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_stok_mutasi
    ADD CONSTRAINT fk_t_stok_mutasi_obat FOREIGN KEY (obat_id) REFERENCES public.m_obat(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_tindakan fk_t_tindakan_dokter; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_tindakan
    ADD CONSTRAINT fk_t_tindakan_dokter FOREIGN KEY (dokter_id) REFERENCES public.m_dokter(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_tindakan fk_t_tindakan_kunjungan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_tindakan
    ADD CONSTRAINT fk_t_tindakan_kunjungan FOREIGN KEY (kunjungan_id) REFERENCES public.t_kunjungan(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: t_tindakan fk_t_tindakan_tindakan; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.t_tindakan
    ADD CONSTRAINT fk_t_tindakan_tindakan FOREIGN KEY (tindakan_id) REFERENCES public.m_tindakan(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict yiOBfEUcUVIxtwVGiVNSNtV0skI2YSO0I4ZGkcE5WXfM8aqFoPcj0bVWSggi13M

